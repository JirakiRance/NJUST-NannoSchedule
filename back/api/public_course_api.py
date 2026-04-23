from fastapi import APIRouter, HTTPException
from core.config import session_store, HEADERS
from models.schemas import PublicCourseRequest
from parsers.nj_parser import parse_public_courses
import traceback

router = APIRouter()


@router.post("/search_public_courses")
def search_public_courses(req: PublicCourseRequest):
    if req.session_id not in session_store:
        raise HTTPException(status_code=400, detail="会话过期，请重新连接")

    user_session = session_store[req.session_id].get("session")
    url = "http://202.119.81.112:9080/njlgdx/kbcx/kbxx_kc_ifr"

    payload = {
        "xnxqh": req.term, "skyx": "", "kkyx": "", "zzdKcSX": "",
        "kc": req.keyword, "zc1": "", "zc2": "", "jc1": "", "jc2": ""
    }

    try:
        resp = user_session.post(url, data=payload, headers=HEADERS, timeout=15, proxies={"http": None, "https": None})
        resp.encoding = 'utf-8'
        courses = parse_public_courses(resp.text)
        return {"msg": "成功", "data": courses}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")