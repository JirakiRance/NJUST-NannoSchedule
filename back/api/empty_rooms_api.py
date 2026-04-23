from fastapi import APIRouter, HTTPException
from core.config import session_store, HEADERS
from models.schemas import EmptyRoomRequest
from parsers.nj_parser import parse_empty_rooms_matrix
import traceback

router = APIRouter()


@router.post("/empty_rooms")
def get_empty_rooms(req: EmptyRoomRequest):
    if req.session_id not in session_store:
        raise HTTPException(status_code=400, detail="会话过期，请重新连接")

    user_session = session_store[req.session_id].get("session")
    query_url = "http://202.119.81.112:9080/njlgdx/kbcx/kbxx_classroom_ifr"

    # 新接口的真实教学楼 ID 映射
    building_map = {
        "I": ["1"], "II": ["2"], "IV": ["6"], "YF": ["3"],  # 3通常是III教学楼/逸夫楼
        "other": ["5", "10", "9"],  # 东区平房, 专业教室, 艺文馆
        "all": ["1", "2", "3", "6", "5", "10", "9"]
    }
    target_buildings = building_map.get(req.building, ["1", "2", "3", "6"])
    target_day_index = int(req.day) - 1  # 1-7 转换为 0-6 索引

    final_rooms = []

    for b_code in target_buildings:
        room_stats = {}  # 记录每个教室的状态：{ "I-301": {"is_free": True, "has_any_class": False} }

        for period in req.period_list:
            start_p, end_p = period.split("-")
            # 新接口的节次没有前导0，必须转int去除，比如 "01" -> "1"
            payload = {
                "xnxqh": req.term, "skyx": "", "kkyx": "", "zzdKcSX": "", "kc": "",
                "xqid": "01", "jzwid": b_code,
                "zc1": req.week, "zc2": req.week,
                "xq": "", "xq2": "",  # 留空！强制返回7天数据
                "jc1": str(int(start_p)), "jc2": str(int(end_p))
            }

            try:
                resp = user_session.post(query_url, data=payload, headers=HEADERS, timeout=10,
                                         proxies={"http": None, "https": None})
                resp.encoding = 'utf-8'
                matrix = parse_empty_rooms_matrix(resp.text)

                for room_name, days_free in matrix.items():
                    if room_name not in room_stats:
                        room_stats[room_name] = {"is_free": True, "has_any_class": False}

                    # 1. 在目标日期的这个时段，必须没课
                    if not days_free[target_day_index]:
                        room_stats[room_name]["is_free"] = False

                    # 2. 在这一周的这个时段，只要有任何一天有课，就说明它不是考研专用死教室
                    if False in days_free:
                        room_stats[room_name]["has_any_class"] = True

            except Exception as e:
                print(f"扫描楼栋 {b_code} 时段 {period} 失败: {e}")
                continue

        # 筛选出满足条件的教室
        for name, stats in room_stats.items():
            if stats["is_free"] and stats["has_any_class"]:
                final_rooms.append(name)

    return {"msg": "成功", "data": final_rooms}