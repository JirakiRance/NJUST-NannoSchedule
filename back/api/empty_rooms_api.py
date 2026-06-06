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

    # 教学楼 ID 映射
    building_map = {
        "I": ["1"], "II": ["2"], "IV": ["6"], "YF": ["3"],
        "other": ["5", "10", "9"],
        "all": ["1", "2", "3", "6", "5", "10", "9"]
    }
    target_buildings = building_map.get(req.building, ["1", "2", "3", "6"])
    target_day_index = int(req.day) - 1  # 1-7 转换为 0-6 索引

    final_rooms = []

    # ===== 测试监控打印开始 =====
    print(f"\n[空教室雷达] 目标: 星期{req.day} | 楼栋={req.building} | 请求时段={req.period_list}")

    for b_code in target_buildings:
        room_stats = {}  # 记录纯净的空闲状态

        for period in req.period_list:
            start_p, end_p = period.split("-")
            payload = {
                "xnxqh": req.term, "skyx": "", "kkyx": "", "zzdKcSX": "", "kc": "",
                "xqid": "01", "jzwid": b_code,
                "zc1": req.week, "zc2": req.week,
                "xq": "", "xq2": "",  # 留空强制返回7天数据
                "jc1": str(int(start_p)), "jc2": str(int(end_p))
            }

            try:
                resp = user_session.post(query_url, data=payload, headers=HEADERS, timeout=10,
                                         proxies={"http": None, "https": None})
                resp.encoding = 'utf-8'
                matrix = parse_empty_rooms_matrix(resp.text)

                free_count = 0
                for room_name, days_free in matrix.items():
                    if room_name not in room_stats:
                        room_stats[room_name] = True

                    # 只要这个教室在目标日期的目标时段有课，就不空闲
                    if not days_free[target_day_index]:
                        room_stats[room_name] = False
                    elif room_stats[room_name]:
                        free_count += 1

                print(f" -> 扫描楼栋代码[{b_code}] 时段[{period}]：教务处返回 {len(matrix)} 间，当前完全空闲 {free_count} 间")

            except Exception as e:
                print(f" -> 扫描楼栋[{b_code}] 时段[{period}] 失败: {e}")
                continue

        # 将后端纯净判断为空闲的教室加入结果
        for name, is_free in room_stats.items():
            if is_free:
                final_rooms.append(name)

    print(f"[空教室雷达] 本次请求纯净返回: {len(final_rooms)} 间。 (将交由前端进行并发剔除)")
    print(f"=========================================\n")
    # ===== 测试监控打印结束 =====

    return {"msg": "成功", "data": final_rooms}