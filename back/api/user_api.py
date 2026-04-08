from fastapi import APIRouter, HTTPException
import requests
import base64
import uuid
import traceback
from core.config import session_store, HEADERS, CAPTCHA_URL, LOGIN_URL, SCHEDULE_URL, GRADES_LIST_URL, EXAMS_LIST_URL, LEVEL_EXAMS_URL, DEBUG
from models.schemas import LoginRequest
from parsers.nj_parser import parse_schedule, parse_grades, parse_exams, parse_level_exams

router = APIRouter()

@router.get("/captcha")
def get_captcha():
    try:
        session = requests.Session()
        response = session.get(CAPTCHA_URL, headers=HEADERS, timeout=5)
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
        login_resp = user_session.post(LOGIN_URL, data=login_data, headers=HEADERS, timeout=5)
        login_resp.encoding = 'utf-8'
        if "退出" not in login_resp.text and "欢迎" not in login_resp.text and "个人信息" not in login_resp.text:
            raise HTTPException(status_code=401, detail="登录失败：账号或密码错误")

        schedule_resp = user_session.get(SCHEDULE_URL, headers=HEADERS, timeout=5)
        schedule_resp.encoding = 'utf-8'
        courses = parse_schedule(schedule_resp.text)

        grade_resp = user_session.post(GRADES_LIST_URL, data={'kksj': '', 'kcxz': '', 'kcmc': '', 'xsfs': 'max', 'pageSize': '1000', 'pageNum': '1'}, headers=HEADERS, timeout=5)
        grade_resp.encoding = 'utf-8'
        grades = parse_grades(grade_resp.text)

        exam_resp = user_session.post(EXAMS_LIST_URL, data={'xnxqid': ''}, headers=HEADERS, timeout=5)
        exam_resp.encoding = 'utf-8'
        exams = parse_exams(exam_resp.text)

        level_exam_resp = user_session.get(LEVEL_EXAMS_URL, headers=HEADERS, timeout=5)
        level_exam_resp.encoding = 'utf-8'
        level_exams = parse_level_exams(level_exam_resp.text)

        del session_store[req.session_id]
        return {"msg": "成功", "data": {"courses": courses, "grades": grades, "exams": exams, "level_exams": level_exams}}
    except Exception as e:
        if DEBUG: traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"内部错误: {str(e)}")


@router.post("/pure_login")
def pure_login(req: LoginRequest):
    if req.session_id not in session_store: raise HTTPException(status_code=400, detail="会话失效")
    user_session = session_store[req.session_id]
    login_data = {'USERNAME': req.username, 'PASSWORD': req.password, 'useDogCode': '', 'RANDOMCODE': req.captcha}
    try:
        # 加了防代理机制
        login_resp = user_session.post(LOGIN_URL, data=login_data, headers=HEADERS, timeout=10, proxies={"http": None, "https": None})
        login_resp.encoding = 'utf-8'
        if "退出" not in login_resp.text and "欢迎" not in login_resp.text and "个人信息" not in login_resp.text:
            raise HTTPException(status_code=401, detail="账号、密码或验证码错误")
        return {"msg": "登录成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"内部错误: {str(e)}")