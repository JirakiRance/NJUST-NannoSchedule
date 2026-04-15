import random
from urllib.parse import urlparse
from fastapi import APIRouter, HTTPException
import requests
import base64
import uuid
import traceback
from core.config import session_store, HEADERS, CAPTCHA_URL, LOGIN_URL, SCHEDULE_URL, GRADES_LIST_URL, EXAMS_LIST_URL, LEVEL_EXAMS_URL, DEBUG
from models.schemas import LoginRequest,KeepAliveRequest,SniffDataRequest
from parsers.nj_parser import parse_schedule, parse_grades, parse_exams, parse_level_exams, parse_term_options

router = APIRouter()

USER_API_DEBUG = False

# 公用的防代理配置
NO_PROXY = {"http": None, "https": None}

@router.get("/captcha")
def get_captcha():
    try:
        session = requests.Session()
        #  proxies=NO_PROXY，强制直连教务处
        response = session.get(CAPTCHA_URL, headers=HEADERS, timeout=10, proxies=NO_PROXY)
        img_base64 = base64.b64encode(response.content).decode('utf-8')
        session_id = str(uuid.uuid4())
        session_store[session_id] = session
        return {"session_id": session_id, "captcha_image": f"data:image/jpeg;base64,{img_base64}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取验证码失败: {e}")

@router.post("/sync_all")
def sync_all(req: LoginRequest):
    if req.session_id not in session_store: raise HTTPException(status_code=400, detail="会话已过期，请刷新")
    user_session = session_store[req.session_id]
    login_data = {'USERNAME': req.username, 'PASSWORD': req.password, 'useDogCode': '', 'RANDOMCODE': req.captcha}

    try:
        # 所有的请求全部加上 proxies=NO_PROXY
        login_resp = user_session.post(LOGIN_URL, data=login_data, headers=HEADERS, timeout=10, proxies=NO_PROXY, allow_redirects=True)
        login_resp.encoding = 'utf-8'

        # 捕获真实的业务节点并绑定到 session 对象上
        parsed = urlparse(login_resp.url)
        user_session.active_node = f"{parsed.scheme}://{parsed.netloc}"

        if "退出" not in login_resp.text and "欢迎" not in login_resp.text and "个人信息" not in login_resp.text:
            raise HTTPException(status_code=401, detail="登录失败：账号或密码错误")

        schedule_resp = user_session.post(SCHEDULE_URL, data={'xnxq01id': req.term, 'zc': ''}, headers=HEADERS, timeout=10, proxies=NO_PROXY)
        schedule_resp.encoding = 'utf-8'
        courses = parse_schedule(schedule_resp.text)
        term_options = parse_term_options(schedule_resp.text)

        grade_resp = user_session.post(GRADES_LIST_URL, data={'kksj': '', 'kcxz': '', 'kcmc': '', 'xsfs': 'max', 'pageSize': '1000', 'pageNum': '1'}, headers=HEADERS, timeout=10, proxies=NO_PROXY)
        grade_resp.encoding = 'utf-8'
        grades = parse_grades(grade_resp.text)

        exam_resp = user_session.post(EXAMS_LIST_URL, data={'xnxqid': req.term}, headers=HEADERS, timeout=10, proxies=NO_PROXY)
        exam_resp.encoding = 'utf-8'
        exams = parse_exams(exam_resp.text)

        level_exam_resp = user_session.get(LEVEL_EXAMS_URL, headers=HEADERS, timeout=10, proxies=NO_PROXY)
        level_exam_resp.encoding = 'utf-8'
        level_exams = parse_level_exams(level_exam_resp.text)

        if not req.keep_alive:
            del session_store[req.session_id]

        return {"msg": "成功", "data": {"courses": courses, "grades": grades, "exams": exams, "level_exams": level_exams, "term_options": term_options}}
    except Exception as e:
        if DEBUG: traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"内部错误: {str(e)}")


@router.post("/pure_login")
def pure_login(req: LoginRequest):
    if req.session_id not in session_store: raise HTTPException(status_code=400, detail="会话失效")
    user_session = session_store[req.session_id]
    login_data = {'USERNAME': req.username, 'PASSWORD': req.password, 'useDogCode': '', 'RANDOMCODE': req.captcha}
    try:
        #  这里之前已经加了，为了统一也用 NO_PROXY 变量
        login_resp = user_session.post(LOGIN_URL, data=login_data, headers=HEADERS, timeout=10, proxies=NO_PROXY)
        login_resp.encoding = 'utf-8'
        if "退出" not in login_resp.text and "欢迎" not in login_resp.text and "个人信息" not in login_resp.text:
            raise HTTPException(status_code=401, detail="账号、密码或验证码错误")
        return {"msg": "登录成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"内部错误: {str(e)}")


# ======== 下面是嗅探心跳接口 ========
@router.post("/keep_alive")
def keep_alive(req: KeepAliveRequest):
    user_session = session_store.get(req.session_id)
    if not user_session:
        raise HTTPException(status_code=401, detail="Session 已过期或被清理")

    # 获取绑定的业务节点，如果没有则兜底用网关
    active_node = getattr(user_session, 'active_node', "http://202.119.81.113:8080")
    img_index = random.randint(1, 12)
    img_url = f"{active_node}/njlgdx/framework/images/tp{img_index}.png"

    try:
        resp = user_session.get(img_url, headers=HEADERS, timeout=10, proxies=NO_PROXY, allow_redirects=True)
        if 'image' in resp.headers.get('Content-Type', '').lower():
            return {"status": "alive", "node": active_node}
        else:
            del session_store[req.session_id]  # 发现死亡，清理内存
            raise HTTPException(status_code=401, detail="被系统踢出下线")
    except Exception as e:
        raise HTTPException(status_code=500, detail="请求节点图片失败")

# ======== 数据嗅探接口 ========
@router.post("/sniff_data")
def sniff_data(req: SniffDataRequest):
    user_session = session_store.get(req.session_id)
    if not user_session:
        raise HTTPException(status_code=401, detail="Session 已过期或被清理")

    try:
        # 1. 嗅探学期列表变动 (通过极其轻量的获取课表操作顺手牵羊)
        schedule_resp = user_session.post(SCHEDULE_URL, data={'xnxq01id': req.term, 'zc': ''}, headers=HEADERS, timeout=10, proxies=NO_PROXY)
        schedule_resp.encoding = 'utf-8'
        term_options = parse_term_options(schedule_resp.text)

        # 2. 嗅探当前学期最新考试安排
        exam_resp = user_session.post(EXAMS_LIST_URL, data={'xnxqid': req.term}, headers=HEADERS, timeout=10, proxies=NO_PROXY)
        exam_resp.encoding = 'utf-8'
        exams = parse_exams(exam_resp.text)

        if USER_API_DEBUG:
            # ---------------------------------------------------------
            # 测试代码：强行塞入一门假考试来欺骗前端触发更新警报
            # ---------------------------------------------------------
            exams.append({
                "session": "期末测试",
                "course_id": "TEST-001",
                "course_name": "《嗅探兽饲养与防脱发指南》",  # 骚气一点的名字方便认出
                "time": "2026-12-31 14:00-16:00",
                "room": "赛博空间 第1教室",
                "seat": "01"
            })
            # ---------------------------------------------------------

        return {"status": "success", "data": {"exams": exams, "term_options": term_options}}
    except Exception as e:
        if DEBUG: traceback.print_exc()
        raise HTTPException(status_code=500, detail="数据嗅探通信失败")