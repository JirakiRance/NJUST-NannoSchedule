from bs4 import BeautifulSoup


def parse_grades_html(html_content):
    """
    解析成绩查询返回的表格数据 (cjcx_list)
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    table = soup.find('table', id='dataList')
    if not table:
        return []

    results = []
    rows = table.find_all('tr')[1:]  # 跳过表头
    for row in rows:
        tds = row.find_all('td')
        if len(tds) < 11: continue

        # 提取关键信息
        item = {
            "semester": tds[1].get_text(strip=True),
            "name": tds[3].get_text(strip=True),
            "score": tds[4].get_text(strip=True),
            "credit": float(tds[6].get_text(strip=True) or 0),
            "type": tds[10].get_text(strip=True),  # 课程性质
            "attr": tds[9].get_text(strip=True)  # 课程属性 (必修/计划外)
        }
        # 简单计算一个绩点（如果教务处没给的话，这里可以根据你们学校的算法调）
        try:
            score_val = float(item["score"])
            item["gpa"] = round(max(0, (score_val - 50) / 10), 1) if score_val >= 60 else 0.0
            item["numericScore"] = score_val
        except:
            # 处理“优、良、中、差”的情况
            mapping = {"优": 95, "良": 85, "中": 75, "及格": 65, "不及格": 0}
            item["numericScore"] = mapping.get(item["score"], 0)
            item["gpa"] = 4.0 if item["score"] == "优" else 3.0

        results.append(item)
    return results


def parse_schedule_html(html_content):
    """
    解析课表页面 (xskb_list.do)
    """
    # 这里对应你之前课表的解析逻辑，重点是提取每一节课的 zc(周次)
    # ... 之前的逻辑 ...
    pass