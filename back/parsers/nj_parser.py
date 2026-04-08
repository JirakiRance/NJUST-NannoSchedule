from bs4 import BeautifulSoup
import re

def calculate_njust_4_0_gpa(score_text):
    try:
        num = float(score_text)
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
        score_map = {
            "优": (4.0, 90), "A": (4.0, 90), "优-": (3.7, 87), "A-": (3.7, 87),
            "良+": (3.3, 83), "良": (3.0, 80), "B": (3.0, 80), "良-": (2.7, 76),
            "中+": (2.3, 73), "中": (2.0, 70), "C": (2.0, 70), "中-": (1.5, 66),
            "及格": (1.0, 60), "D": (1.0, 60), "不及格": (0.0, 0), "F": (0.0, 0)
        }
        return score_map.get(score_text.strip().upper(), (0.0, 0))

def parse_schedule(html_content):
    soup = BeautifulSoup(html_content, 'lxml')
    exact_times = {}
    day_map = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7}

    data_list_table = soup.find('table', id='dataList')
    if data_list_table:
        for row in data_list_table.find_all('tr')[1:]:
            tds = row.find_all('td')
            if len(tds) >= 6:
                raw_name = tds[3].get_text()
                c_name_clean = re.sub(r'\s+', '', raw_name)
                time_text = tds[5].get_text()
                for m in re.finditer(r'星期([一二三四五六日])\D*(\d+)\D*-\D*(\d+)\D*节', time_text):
                    d_str, s_str, e_str = m.groups()
                    exact_times[(c_name_clean, day_map.get(d_str))] = (int(s_str), int(e_str) - int(s_str) + 1)

    table = soup.find('table', id='kbtable') or soup.find(lambda tag: tag.name == 'table' and tag.find(class_='kbcontent'))
    all_courses = []
    if table:
        grid = {}
        for r_idx, tr in enumerate(table.find_all('tr')):
            col_idx = 0
            for cell in tr.find_all(['td', 'th']):
                while (r_idx, col_idx) in grid: col_idx += 1
                rowspan, colspan = int(cell.get('rowspan', 1)), int(cell.get('colspan', 1))
                for i in range(rowspan):
                    for j in range(colspan): grid[(r_idx + i, col_idx + j)] = cell
                col_idx += colspan

        day_offset = 1
        for (r, c), cell in grid.items():
            if r == 0 and ('一' in cell.text or '1' in cell.text):
                day_offset = c - 1
                break

        for (r, c), cell in grid.items():
            if r == 0 or c <= day_offset: continue
            day = c - day_offset
            if r == 1: default_start, default_duration = 1, 3
            elif r == 2: default_start, default_duration = 4, 2
            elif r == 3: default_start, default_duration = 6, 2
            elif r == 4: default_start, default_duration = 8, 3
            elif r == 5: default_start, default_duration = 11, 3
            elif r == 6: default_start, default_duration = 14, 2
            else: default_start, default_duration = 1, 2

            for div in cell.find_all('div', class_='kbcontent'):
                if not div.text.strip(): continue
                blocks = []
                current_block = {}
                for node in div.contents:
                    if node.name == 'br': continue
                    text, title = "", ""
                    if isinstance(node, str): text = node.strip()
                    elif node.name == 'font':
                        title = node.get('title', '')
                        text = node.text.strip()
                    else: text = node.get_text(strip=True)

                    if not text: continue
                    if '---' in text:
                        if current_block.get('name'):
                            blocks.append(current_block)
                            current_block = {}
                        continue

                    if title == '老师': current_block['teacher'] = text
                    elif title == '周次(节次)': current_block['weeks'] = text
                    elif title == '教室': current_block['room'] = text
                    else:
                        if current_block.get('name') and (current_block.get('teacher') or current_block.get('weeks') or current_block.get('room')):
                            blocks.append(current_block)
                            current_block = {}
                        if not current_block.get('name'): current_block['name'] = text

                if current_block.get('name'): blocks.append(current_block)

                for block in blocks:
                    course_name = block.get('name', '')
                    if not course_name: continue
                    start, duration = default_start, default_duration
                    clean_course_name = re.sub(r'\s+', '', course_name)
                    if (clean_course_name, day) in exact_times:
                        start, duration = exact_times[(clean_course_name, day)]

                    all_courses.append({
                        "name": course_name, "teacher": block.get('teacher', ''),
                        "weeks": block.get('weeks', ''), "room": block.get('room', ''),
                        "day": day, "start": start, "duration": duration
                    })
    return all_courses

def parse_grades(html_content):
    soup = BeautifulSoup(html_content, 'lxml')
    table = soup.find('table', id='dataList')
    if not table: return []
    results = []
    for row in table.find_all('tr')[1:]:
        try:
            tds = row.find_all('td')
            if len(tds) < 11: continue
            credit = float(tds[6].get_text(strip=True) or 0.0)
            attr = tds[9].get_text(strip=True)
            gpa, numeric_score = calculate_njust_4_0_gpa(tds[4].get_text(strip=True))

            results.append({
                "semester": tds[1].get_text(strip=True), "name": tds[3].get_text(strip=True),
                "score": tds[4].get_text(strip=True), "numericScore": numeric_score,
                "credit": credit, "nature": tds[10].get_text(strip=True),
                "attr": attr, "gpa": gpa, "selected": (attr == "必修")
            })
        except Exception: continue
    return results

def parse_exams(html_content):
    soup = BeautifulSoup(html_content, 'lxml')
    table = soup.find('table', id='dataList') or soup.find('table', class_='Nsb_r_list')
    if not table: return []
    return [[td.get_text(strip=True) for td in row.find_all('td')] for row in table.find_all('tr')[1:]]

def parse_level_exams(html_content):
    soup = BeautifulSoup(html_content, 'lxml')
    table = soup.find('table', id='dataList')
    if not table: return []
    results = []
    for row in table.find_all('tr')[2:]:
        tds = row.find_all('td')
        if len(tds) >= 9:
            results.append({
                "name": tds[1].get_text(strip=True), "score_written": tds[2].get_text(strip=True),
                "score_machine": tds[3].get_text(strip=True), "score_total": tds[4].get_text(strip=True),
                "grade_written": tds[5].get_text(strip=True), "grade_machine": tds[6].get_text(strip=True),
                "grade_total": tds[7].get_text(strip=True), "date": tds[8].get_text(strip=True),
            })
    return results



def parse_public_courses(html_content):
    soup = BeautifulSoup(html_content, 'lxml')
    table = soup.find('table', id='kbtable')
    if not table: return []

    results = []
    # 跳过前面2行表头
    rows = table.find_all('tr')[2:]

    slot_names = ["1-3节", "4-5节", "6-7节", "8-10节", "11-13节", "14节"]
    day_names = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

    for row in rows:
        tds = row.find_all('td')
        if len(tds) < 43: continue

        course_name = tds[0].get_text(strip=True)

        # 遍历 42 个时间格子 (7天 * 6大节)
        for i in range(42):
            cell = tds[i + 1]
            divs = cell.find_all('div', class_='kbcontent1')
            for div in divs:
                # 用换行符切开 9241062301 \n 俞研(1-5周) \n Ⅳ-A410
                lines = div.get_text(separator='\n', strip=True).split('\n')
                if len(lines) >= 2:
                    class_id = lines[0]
                    teacher = lines[1]
                    weeks = lines[2] if len(lines) > 2 else ""
                    room = lines[3] if len(lines) > 3 else ""

                    day = i // 6
                    slot = i % 6

                    results.append({
                        "course_name": course_name,
                        "class_id": class_id,
                        "teacher": teacher,
                        "weeks": weeks,
                        "room": room,
                        "day_str": day_names[day],
                        "slot_str": slot_names[slot]
                    })
    return results


def parse_empty_rooms_matrix(html_content):
    """
    解析教室课表矩阵
    返回格式: { "I-301": [True, True, False, True, True, True, True] } # True表示没课
    """
    soup = BeautifulSoup(html_content, 'lxml')
    table = soup.find('table', id='kbtable')
    if not table: return {}

    room_matrix = {}
    rows = table.find_all('tr')[2:]  # 跳过前两行表头

    for row in rows:
        tds = row.find_all('td')
        if len(tds) < 8: continue

        room_name = tds[0].get_text(strip=True)
        days_free = []

        # 遍历周一到周日的7个格子
        for i in range(1, 8):
            cell = tds[i]
            # 如果格子里找不到 kbcontent1 的 div，说明这节没课
            has_class = cell.find('div', class_='kbcontent1') is not None
            days_free.append(not has_class)

        room_matrix[room_name] = days_free

    return room_matrix