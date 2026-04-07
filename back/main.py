from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
import base64
import uuid
import re
import traceback

DEBUG = False

app = FastAPI(title="南理工教务 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= 系统接口配置 =================
LOGIN_URL = "http://202.119.81.113:8080/Logon.do?method=logon"
CAPTCHA_URL = "http://202.119.81.113:8080/verifycode.servlet"
SCHEDULE_URL = "http://202.119.81.112:9080/njlgdx/xskb/xskb_list.do?Ves632DSdyV=NEW_XSD_PYGL"
GRADES_LIST_URL = "http://202.119.81.112:9080/njlgdx/kscj/cjcx_list"
EXAMS_LIST_URL = "http://202.119.81.112:9080/njlgdx/xsks/xsksap_list"
LEVEL_EXAMS_URL = "http://202.119.81.112:9080/njlgdx/kscj/djkscj_list"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
}

# 内存会话存储
session_store = {}


class LoginRequest(BaseModel):
    session_id: str
    username: str
    password: str
    captcha: str


class BookSearchRequest(BaseModel):
    keyword: str

class BookDetailRequest(BaseModel):
    id: str


# ================= 核心解析逻辑 =================

def calculate_njust_4_0_gpa(score_text):
    """
    根据南理工标准计算 4.0 绩点，支持百分制与等级制
    """
    try:
        num = float(score_text)
        if num >= 90:
            return 4.0, num
        elif num >= 85:
            return 3.7, num
        elif num >= 82:
            return 3.3, num
        elif num >= 78:
            return 3.0, num
        elif num >= 75:
            return 2.7, num
        elif num >= 72:
            return 2.3, num
        elif num >= 68:
            return 2.0, num
        elif num >= 64:
            return 1.5, num
        elif num >= 60:
            return 1.0, num
        else:
            return 0.0, num
    except ValueError:
        score_map = {
            "优": (4.0, 90), "A": (4.0, 90),
            "优-": (3.7, 87), "A-": (3.7, 87),
            "良+": (3.3, 83),
            "良": (3.0, 80), "B": (3.0, 80),
            "良-": (2.7, 76),
            "中+": (2.3, 73),
            "中": (2.0, 70), "C": (2.0, 70),
            "中-": (1.5, 66),
            "及格": (1.0, 60), "D": (1.0, 60),
            "不及格": (0.0, 0), "F": (0.0, 0)
        }
        clean_score = score_text.strip().upper()
        return score_map.get(clean_score, (0.0, 0))


def parse_books(html_content):
    """
    解析图书馆 OPAC 搜索结果
    """
    soup = BeautifulSoup(html_content, 'lxml')
    books = []

    # OPAC系统返回的是包含很多 <li> 的列表
    for li in soup.find_all('li', class_='ng-isolate-scope'):
        try:
            # 1. 解析书名 (把外面的 1. 2. 标号去掉)
            title_a = li.find('div', class_='resultList-title').find('a')
            title = title_a.get_text(strip=True) if title_a else "未知书名"

            # 2. 解析封面
            img = li.find('img')
            cover = img.get('src') if img else ""
            if cover and cover.startswith('../'):  # 处理没有封面时的默认占位图
                cover = "http://202.119.83.14:8080/uopac" + cover[2:]

            # 3. 解析作者和出版社
            dds = li.find_all('dd')
            author = dds[0].get_text(strip=True) if len(dds) > 0 else "未知作者"
            publisher = dds[1].get_text(strip=True) if len(dds) > 1 else "未知出版社"
            # 清理里面可能存在的 \xa0 空格字符
            publisher = publisher.replace('\xa0', ' ')

            # 4. 解析馆藏数量
            avail_span = li.find(lambda tag: tag.name == 'span' and '馆藏复本' in tag.text)
            total = "0"
            available = "0"
            if avail_span:
                match_total = re.search(r'馆藏复本：\s*(\d+)', avail_span.text)
                match_avl = re.search(r'可借复本：\s*(\d+)', avail_span.text)
                if match_total: total = match_total.group(1)
                if match_avl: available = match_avl.group(1)

            books.append({
                "id": item.get('marcRecNo', ''),
                "title": title,
                "cover": cover,
                "author": author,
                "publisher": publisher,
                "total": total,
                "available": available
            })
        except Exception as e:
            continue  # 如果某本书格式解析失败，跳过它，防止整个接口崩溃

    return books


def parse_level_exams(html_content):
    """
    解析等级考试成绩
    """
    soup = BeautifulSoup(html_content, 'lxml')
    table = soup.find('table', id='dataList')
    if not table:
        return []

    results = []
    # 表头占了 2 行，所以从下标 2 开始
    rows = table.find_all('tr')[2:]
    for row in rows:
        tds = row.find_all('td')
        if len(tds) >= 9:
            results.append({
                "name": tds[1].get_text(strip=True),
                "score_written": tds[2].get_text(strip=True),
                "score_machine": tds[3].get_text(strip=True),
                "score_total": tds[4].get_text(strip=True), # 分数类总分
                "grade_written": tds[5].get_text(strip=True),
                "grade_machine": tds[6].get_text(strip=True),
                "grade_total": tds[7].get_text(strip=True), # 等级类总分
                "date": tds[8].get_text(strip=True),
            })
    return results

def parse_exams(html_content):
    """
    解析考试信息，返回二维数组
    """
    soup = BeautifulSoup(html_content, 'lxml')
    table = soup.find('table', id='dataList')
    if not table:
        table = soup.find('table', class_='Nsb_r_list')
    if not table:
        return []

    results = []
    rows = table.find_all('tr')[1:]
    for row in rows:
        tds = row.find_all('td')
        if not tds: continue
        row_data = [td.get_text(strip=True) for td in tds]
        results.append(row_data)
    return results


def parse_schedule(html_content):
    """
    解析全学期课表
    采用双表联合解析：以底部 dataList 精准时间覆盖顶部 kbtable 推算时间
    """
    soup = BeautifulSoup(html_content, 'lxml')
    exact_times = {}
    day_map = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7}

    # ================= 核心修复 1：无死角提取精准时间 =================
    data_list_table = soup.find('table', id='dataList')
    if data_list_table:
        for row in data_list_table.find_all('tr')[1:]:
            tds = row.find_all('td')
            if len(tds) >= 6:
                # 彻底去除课名中的所有空格、换行、零宽字符，作为最纯净的 Key
                raw_name = tds[3].get_text()
                c_name_clean = re.sub(r'\s+', '', raw_name)

                # 直接把时间列转成纯文本，用超级宽容的正则去抓取所有时间段
                time_text = tds[5].get_text()
                # 兼容 '星期五(02-03小节)' 或 '星期五( 2 - 3 节 )' 等各种奇葩格式
                for m in re.finditer(r'星期([一二三四五六日])\D*(\d+)\D*-\D*(\d+)\D*节', time_text):
                    d_str, s_str, e_str = m.groups()
                    exact_day = day_map.get(d_str)
                    exact_start = int(s_str)
                    exact_duration = int(e_str) - exact_start + 1
                    # 存入精准字典
                    exact_times[(c_name_clean, exact_day)] = (exact_start, exact_duration)

    # 2. 解析网格结构
    table = soup.find('table', id='kbtable')
    if not table:
        table = soup.find(lambda tag: tag.name == 'table' and tag.find(class_='kbcontent'))

    all_courses = []
    if table:
        grid = {}
        for r_idx, tr in enumerate(table.find_all('tr')):
            col_idx = 0
            for cell in tr.find_all(['td', 'th']):
                while (r_idx, col_idx) in grid:
                    col_idx += 1
                rowspan = int(cell.get('rowspan', 1))
                colspan = int(cell.get('colspan', 1))
                for i in range(rowspan):
                    for j in range(colspan):
                        grid[(r_idx + i, col_idx + j)] = cell
                col_idx += colspan

        day_offset = 1
        for (r, c), cell in grid.items():
            if r == 0 and ('一' in cell.text or '1' in cell.text):
                day_offset = c - 1
                break

        for (r, c), cell in grid.items():
            if r == 0 or c <= day_offset:
                continue

            day = c - day_offset

            if r == 1:
                default_start, default_duration = 1, 3
            elif r == 2:
                default_start, default_duration = 4, 2
            elif r == 3:
                default_start, default_duration = 6, 2
            elif r == 4:
                default_start, default_duration = 8, 3
            elif r == 5:
                default_start, default_duration = 11, 3
            elif r == 6:
                default_start, default_duration = 14, 2
            else:
                default_start, default_duration = 1, 2

            for div in cell.find_all('div', class_='kbcontent'):
                if not div.text.strip():
                    continue

                blocks = []
                current_block = {}

                for node in div.contents:
                    if node.name == 'br':
                        continue

                    text = ""
                    title = ""
                    if isinstance(node, str):
                        text = node.strip()
                    elif node.name == 'font':
                        title = node.get('title', '')
                        text = node.text.strip()
                    else:
                        text = node.get_text(strip=True)

                    if not text:
                        continue

                    # 分割线处理
                    if '---' in text:
                        if current_block.get('name'):
                            blocks.append(current_block)
                            current_block = {}
                        continue

                    if title == '老师':
                        current_block['teacher'] = text
                    elif title == '周次(节次)':
                        current_block['weeks'] = text
                    elif title == '教室':
                        current_block['room'] = text
                    else:
                        if current_block.get('name') and (
                                current_block.get('teacher') or current_block.get('weeks') or current_block.get(
                            'room')):
                            blocks.append(current_block)
                            current_block = {}

                        if not current_block.get('name'):
                            current_block['name'] = text

                if current_block.get('name'):
                    blocks.append(current_block)

                for block in blocks:
                    course_name = block.get('name', '')
                    if not course_name:
                        continue
                    weeks = block.get('weeks', '')

                    start = default_start
                    duration = default_duration

                    # 必须把总览表里的名字也同样去除所有空格，确保 Key 绝对匹配！
                    clean_course_name = re.sub(r'\s+', '', course_name)

                    # 如果在字典里查到了这门课在今天的精准时间，就无情地覆盖掉默认的大节时间！
                    if (clean_course_name, day) in exact_times:
                        start, duration = exact_times[(clean_course_name, day)]

                    all_courses.append({
                        "name": course_name,  # 给前端的名字还是保留原样
                        "teacher": block.get('teacher', ''),
                        "weeks": weeks,
                        "room": block.get('room', ''),
                        "day": day,
                        "start": start,
                        "duration": duration
                    })
    return all_courses


def parse_grades(html_content):
    """
    解析全量成绩并计算 GPA
    """
    soup = BeautifulSoup(html_content, 'lxml')
    table = soup.find('table', id='dataList')
    if not table: return []

    results = []
    rows = table.find_all('tr')[1:]
    for row in rows:
        try:
            tds = row.find_all('td')
            if len(tds) < 11:
                continue

            semester = tds[1].get_text(strip=True)
            name = tds[3].get_text(strip=True)
            score_text = tds[4].get_text(strip=True)

            credit_text = tds[6].get_text(strip=True)
            try:
                credit = float(credit_text) if credit_text else 0.0
            except ValueError:
                credit = 0.0

            attr = tds[9].get_text(strip=True)
            nature = tds[10].get_text(strip=True)

            gpa, numeric_score = calculate_njust_4_0_gpa(score_text)

            results.append({
                "semester": semester,
                "name": name,
                "score": score_text,
                "numericScore": numeric_score,
                "credit": credit,
                "nature": nature,
                "attr": attr,
                "gpa": gpa,
                "selected": (attr == "必修")
            })
        except Exception as e:
            if DEBUG:
                print(f"⚠️ 跳过异常成绩记录: {e}")
            continue

    return results


# ================= API 路由配置 =================

@app.get("/api/captcha")
def get_captcha():
    """
    获取教务处验证码并初始化会话
    """
    session = requests.Session()
    try:
        response = session.get(CAPTCHA_URL, headers=HEADERS, timeout=5)
        img_base64 = base64.b64encode(response.content).decode('utf-8')
        session_id = str(uuid.uuid4())
        session_store[session_id] = session
        return {
            "session_id": session_id,
            "captcha_image": f"data:image/jpeg;base64,{img_base64}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取验证码失败: {e}")


@app.post("/api/sync_all")
def sync_all(req: LoginRequest):
    """
    执行登录并全量抓取课表、成绩、考试数据
    """
    if req.session_id not in session_store:
        raise HTTPException(status_code=400, detail="会话已过期，请刷新网页重试")

    user_session = session_store[req.session_id]
    login_data = {
        'USERNAME': req.username, 'PASSWORD': req.password,
        'useDogCode': '', 'RANDOMCODE': req.captcha
    }

    try:
        # 1. 模拟登录
        login_resp = user_session.post(LOGIN_URL, data=login_data, headers=HEADERS, timeout=5)
        login_resp.encoding = 'utf-8'

        if "退出" not in login_resp.text and "欢迎" not in login_resp.text and "个人信息" not in login_resp.text:
            raise HTTPException(status_code=401, detail="登录失败：账号密码或验证码错误")

        # 2. 抓取课表
        schedule_resp = user_session.get(SCHEDULE_URL, headers=HEADERS, timeout=5)
        schedule_resp.encoding = 'utf-8'
        courses = parse_schedule(schedule_resp.text)

        # 3. 抓取成绩
        grade_params = {'kksj': '', 'kcxz': '', 'kcmc': '', 'xsfs': 'max', 'pageSize': '1000', 'pageNum': '1'}
        grade_resp = user_session.post(GRADES_LIST_URL, data=grade_params, headers=HEADERS, timeout=5)
        grade_resp.encoding = 'utf-8'
        grades = parse_grades(grade_resp.text)

        # 4. 抓取考试
        exam_params = {'xnxqid': ''}
        exam_resp = user_session.post(EXAMS_LIST_URL, data=exam_params, headers=HEADERS, timeout=5)
        exam_resp.encoding = 'utf-8'
        exams = parse_exams(exam_resp.text)

        # 5. 抓取等级考试
        level_exam_resp = user_session.get(LEVEL_EXAMS_URL, headers=HEADERS, timeout=5)
        level_exam_resp.encoding = 'utf-8'
        level_exams = parse_level_exams(level_exam_resp.text)

        # 销毁凭证，释放内存
        del session_store[req.session_id]

        return {
            "msg": "成功",
            "data": {
                "courses": courses,
                "grades": grades,
                "exams": exams,
                "level_exams": level_exams
            }
        }

    except Exception as e:
        if DEBUG:
            traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"内部错误: {str(e)}")


@app.post("/api/search_books")
def search_books(req: BookSearchRequest):
    """
    实时搜索图书馆书籍 (JSON直解 + 深度正则挖矿版)
    """
    search_url = "http://202.119.83.14:8080/uopac/opac/ajax_search_adv.php"

    payload = {
        "searchWords": [{"fieldList": [{"fieldCode": "", "fieldValue": req.keyword}]}],
        "filters": [],
        "limiter": [],
        "first": True,
        "locale": "zh_CN",
        "pageCount": 1,
        "pageSize": 20,
        "sortField": "relevance",
        "sortType": "desc"
    }

    try:
        resp = requests.post(search_url, json=payload, headers=HEADERS, timeout=10)
        resp.encoding = 'utf-8'
        data = resp.json()

        items = []
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            items = data.get('content') or data.get('resultsList') or data.get('searchResult') or []

        books = []
        for item in items:
            # 1. 提取原生带有 HTML 的标题
            title_raw = item.get('title', '')
            # 纯净版书名
            title = re.sub(r'<[^>]+>', '', title_raw)

            # ✨ 核心修复 1：如果在最外层找不到 ID，直接从 title_raw 的超链接里把 marc_no 挖出来！
            book_id = item.get('marcRecNo', '')
            if not book_id:
                m_id = re.search(r'marc_no=([^"&]+)', title_raw)
                if m_id:
                    book_id = m_id.group(1)

            # 2. 提取作者
            author = item.get('author', '未知作者')
            author = re.sub(r'<[^>]+>', '', author)

            # 3. 提取出版社和年份
            publisher = item.get('publisher', '')
            pubYear = item.get('pubYear', '')
            pub_str = f"{publisher} {pubYear}".strip()
            pub_str = re.sub(r'<[^>]+>', '', pub_str)

            # ✨ 核心修复 2：剥离 <b> 标签后再提取馆藏数字
            lend_avl_html = item.get('lendAvl', '')
            clean_lend = re.sub(r'<[^>]+>', '', lend_avl_html)  # 把 <b>馆藏复本：</b>7 变成纯文本 "馆藏复本：7"

            total = "0"
            available = "0"
            if clean_lend:
                m_total = re.search(r'馆藏复本：\s*(\d+)', clean_lend)
                m_avl = re.search(r'可借复本：\s*(\d+)', clean_lend)
                if m_total: total = m_total.group(1)
                if m_avl: available = m_avl.group(1)

            books.append({
                "id": book_id,
                "title": title,
                "author": author,
                "publisher": pub_str,
                "total": total,
                "available": available
            })

        return {"msg": "成功", "data": books}

    except Exception as e:
        print("【后端报错】搜书失败:", e)
        raise HTTPException(status_code=500, detail=f"搜索失败: {str(e)}")


@app.post("/api/book_detail")
def book_detail(req: BookDetailRequest):
    """
    爬取书籍详细信息与馆藏状态
    """
    detail_url = f"http://202.119.83.14:8080/uopac/opac/item.php?marc_no={req.id}"
    try:
        resp = requests.get(detail_url, headers=HEADERS, timeout=10)
        resp.encoding = 'utf-8'
        soup = BeautifulSoup(resp.text, 'lxml')

        # 1. 解析基础信息 (出版社、ISBN等)
        info = {}
        for dl in soup.find_all('dl', class_='booklist'):
            dt = dl.find('dt')
            dd = dl.find('dd')
            if dt and dd:
                key = dt.get_text(strip=True).replace(':', '').replace('：', '')
                val = dd.get_text(strip=True)
                info[key] = val

        # 2. 解析馆藏表格 (楼层、借阅状态)
        holdings = []
        tab_item = soup.find('div', id='tab_item')
        if tab_item:
            table = tab_item.find('table', id='item')
            if table:
                rows = table.find_all('tr')[1:] # 跳过表头
                for row in rows:
                    tds = row.find_all('td')
                    if len(tds) >= 5:
                        holdings.append({
                            "call_no": tds[0].get_text(strip=True), # 索书号
                            "barcode": tds[1].get_text(strip=True), # 条码号
                            "location": tds[3].get_text(strip=True).replace('南京校区—', ''), # 精简馆藏地文字
                            "status": tds[4].get_text(strip=True) # 状态(可借/阅览/已借出)
                        })

        return {"msg": "成功", "data": {"info": info, "holdings": holdings}}

    except Exception as e:
        print("【后端报错】获取书籍详情失败:", e)
        raise HTTPException(status_code=500, detail=f"获取详情失败: {str(e)}")