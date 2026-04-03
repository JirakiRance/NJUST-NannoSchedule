from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
import base64
import uuid
import re

app = FastAPI(title="南理工课表 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= 配置区 =================
LOGIN_URL = "http://202.119.81.113:8080/Logon.do?method=logon"
CAPTCHA_URL = "http://202.119.81.113:8080/verifycode.servlet"
SCHEDULE_URL = "http://202.119.81.112:9080/njlgdx/xskb/xskb_list.do?Ves632DSdyV=NEW_XSD_PYGL"
GRADES_LIST_URL = "http://202.119.81.112:9080/njlgdx/kscj/cjcx_list"
# =========================================

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
}

session_store = {}


class LoginRequest(BaseModel):
    session_id: str
    username: str
    password: str
    captcha: str


@app.get("/api/captcha")
def get_captcha():
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


def parse_schedule(html_content):
    soup = BeautifulSoup(html_content, 'lxml')
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
            for div in cell.find_all('div', class_='kbcontent'):
                if not div.text.strip():
                    continue
                course_name = div.contents[0].strip() if div.contents else ""
                teacher = div.find('font', title='老师').text if div.find('font', title='老师') else ""
                weeks = div.find('font', title='周次(节次)').text if div.find('font', title='周次(节次)') else ""
                room = div.find('font', title='教室').text if div.find('font', title='教室') else ""

                if not course_name:
                    continue

                day = c - day_offset
                start = r * 2 - 1
                duration = 2

                if start >= 9:
                    duration = 3
                match = re.search(r'\[(\d+)-(\d+)节\]', weeks)
                if match:
                    s = int(match.group(1))
                    e = int(match.group(2))
                    start = s
                    duration = e - s + 1

                all_courses.append({
                    "name": course_name, "teacher": teacher, "weeks": weeks,
                    "room": room, "day": day, "start": start, "duration": duration
                })
    return all_courses


@app.post("/api/login_and_get_schedule")
def login_and_get_schedule(req: LoginRequest):
    if req.session_id not in session_store:
        raise HTTPException(status_code=400, detail="会话已过期，请刷新网页重试")

    user_session = session_store[req.session_id]
    login_data = {
        'USERNAME': req.username, 'PASSWORD': req.password,
        'useDogCode': '', 'RANDOMCODE': req.captcha
    }

    try:
        login_resp = user_session.post(LOGIN_URL, data=login_data, headers=HEADERS, timeout=5)
        login_resp.encoding = 'utf-8'

        if "退出" not in login_resp.text and "欢迎" not in login_resp.text and "个人信息" not in login_resp.text:
            raise HTTPException(status_code=401, detail="登录失败：账号密码或验证码错误")

        schedule_resp = user_session.get(SCHEDULE_URL, headers=HEADERS, timeout=5)
        schedule_resp.encoding = 'utf-8'

        parsed_data = parse_schedule(schedule_resp.text)
        del session_store[req.session_id]

        return {"msg": "成功", "data": parsed_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"内部错误: {str(e)}")


# --- 在 main.py 中新增以下代码 ---
def calculate_njust_4_0_gpa(score_text):
    """
    严格执行用户提供的 4.0 绩点映射表
    """
    try:
        num = float(score_text)
        # 百分制映射
        if num >= 90: return 4.0, num
        elif num >= 85: return 3.7, num
        elif num >= 82: return 3.3, num
        elif num >= 78: return 3.0, num
        elif num >= 75: return 2.7, num
        elif num >= 72: return 2.3, num
        elif num >= 68: return 2.0, num
        elif num >= 64: return 1.5, num
        elif num >= 60: return 1.0, num
        else: return 0.0, num
    except ValueError:
        # 等级制映射
        score_map = {
            "优": (4.0, 95), "A": (4.0, 95),
            "优-": (3.7, 87), "A-": (3.7, 87),
            "B+": (3.3, 83),
            "良": (3.0, 80), "B": (3.0, 80),
            "B-": (2.7, 76),
            "C+": (2.3, 73),
            "中": (2.0, 70), "C": (2.0, 70),
            "C-": (1.5, 66),
            "及格": (1.0, 62), "D": (1.0, 62),
            "不及格": (0.0, 0), "F": (0.0, 0)
        }
        clean_score = score_text.strip().upper()
        return score_map.get(clean_score, (0.0, 0))

# main.py 中的 parse_grades 函数
def parse_grades(html_content):
    soup = BeautifulSoup(html_content, 'lxml')
    table = soup.find('table', id='dataList')
    if not table: return []

    results = []
    rows = table.find_all('tr')[1:]
    for row in rows:
        tds = row.find_all('td')
        if len(tds) < 11: continue

        semester = tds[1].get_text(strip=True)
        name = tds[3].get_text(strip=True)
        score_text = tds[4].get_text(strip=True)
        credit = float(tds[6].get_text(strip=True) or 0)

        # 抓取：索引 9 是课程属性，索引 10 是课程性质
        attr = tds[9].get_text(strip=True)
        nature = tds[10].get_text(strip=True)

        # 【调试打印】请在控制台查看这里是否有输出！
        print(f"抓取到课程: {name} | 属性: {attr} | 性质: {nature}")

        is_selected = (attr == "必修")

        # try:
        #     num_score = float(score_text)
        #     gpa = round(max(0, (num_score - 50) / 10), 1) if num_score >= 60 else 0.0
        # except:
        #     mapping = {"优": 95, "良": 85, "中": 75, "及格": 65, "不及格": 0}
        #     num_score = mapping.get(score_text, 0)
        #     gpa = 4.0 if score_text == "优" else (3.0 if score_text == "良" else 0.0)
        # 使用修正后的 4.0 算法
        gpa, num_score = calculate_njust_4_0_gpa(score_text)

        results.append({
            "semester": semester,
            "name": name,
            "score": score_text,
            "numericScore": num_score,
            "credit": credit,
            "nature": nature,  # 确保这里的键名是 nature
            "attr": attr,  # 确保这里的键名是 attr
            "gpa": gpa,
            "selected": is_selected
        })
    return results


@app.post("/api/get_grades")
def get_grades(req: LoginRequest):
    if req.session_id not in session_store:
        raise HTTPException(status_code=400, detail="会话过期")

    s = session_store[req.session_id]
    login_data = {'USERNAME': req.username, 'PASSWORD': req.password, 'RANDOMCODE': req.captcha}

    try:
        login_resp = s.post(LOGIN_URL, data=login_data, headers=HEADERS, timeout=5)
        if "退出" not in login_resp.text:
            raise HTTPException(status_code=401, detail="登录失败，请检查验证码")

        # 核心修复：加入 pageSize 确保拉出所有学期
        grade_params = {
            'kksj': '', 'kcxz': '', 'kcmc': '', 'xsfs': 'max',
            'pageSize': '1000', 'pageNum': '1'
        }
        grade_resp = s.post(GRADES_LIST_URL, data=grade_params, headers=HEADERS)
        grade_resp.encoding = 'utf-8'

        parsed_grades = parse_grades(grade_resp.text)
        return {"msg": "成功", "data": parsed_grades}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))