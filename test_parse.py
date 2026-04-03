from bs4 import BeautifulSoup
import json
import os
import re

# 读取你刚才保存下来的整个课表源码
current_dir = os.path.dirname(os.path.abspath(__file__))
html_path = os.path.join(current_dir, 'schedule.html')

with open(html_path, 'r', encoding='utf-8') as f:
    full_html = f.read()

soup = BeautifulSoup(full_html, 'lxml')

# 1. 锁定教务系统的主课表
table = soup.find('table', id='kbtable')
if not table:
    # 兼容处理：如果没有 id="kbtable"，就找包含课表内容的那个 table
    table = soup.find(lambda tag: tag.name == 'table' and tag.find(class_='kbcontent'))

all_courses = []

if table:
    # ================= 核心魔法：构建虚拟网格 =================
    # 因为网页表格有 rowspan(跨行) 和 colspan(跨列)
    # 我们要在内存里画一个坐标轴 grid[(行数, 列数)] = 对应的格子
    grid = {}
    for r_idx, tr in enumerate(table.find_all('tr')):
        col_idx = 0
        for cell in tr.find_all(['td', 'th']):
            # 如果这个位置已经被前面“跨行/跨列”的格子占用了，就往后挪
            while (r_idx, col_idx) in grid:
                col_idx += 1

            rowspan = int(cell.get('rowspan', 1))
            colspan = int(cell.get('colspan', 1))

            # 把当前格子“填满”它应该占据的二维空间
            for i in range(rowspan):
                for j in range(colspan):
                    grid[(r_idx + i, col_idx + j)] = cell

            col_idx += colspan

    # ================= 动态计算偏移量 =================
    # 不同的学校左侧可能有1列（节次）或2列（上午/节次）。
    # 我们找第一行(r=0)里，哪一列是“星期一”，作为周一的起点坐标。
    day_offset = 1
    for (r, c), cell in grid.items():
        if r == 0 and ('一' in cell.text or '1' in cell.text):
            day_offset = c - 1  # 比如周一是第2列(c=2)，那偏移量就是1
            break

    # ================= 遍历网格，提取数据 =================
    # 此时我们的 grid 已经是一个完美的数学坐标系了
    for (r, c), cell in grid.items():
        # 排除第一行（表头）和左侧边栏（c <= day_offset）
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

            # ================= 算出失去的 3 个坐标！ =================
            # 1. 星期几 (Day)
            # 当前列减去偏移量，完美得出 1-7
            day = c - day_offset

            # 2. 第几节课开始 (Start)
            # 大部分学校一行代表一个大节（1大节=2小节）。r=1是第1节，r=2是第3节...
            start = r * 2 - 1

            # 3. 课程时长 (Duration)
            duration = 2

            # 智能修正：有的学校晚上是3节连上（比如 9-11 节）
            if start >= 9:
                duration = 3

            # 终极修正：如果学校给的文本里有精确时间，比如 "11-16周[03-04节]"
            # 我们就用正则强行提取出来，这个最准！
            match = re.search(r'\[(\d+)-(\d+)节\]', weeks)
            if match:
                s = int(match.group(1))
                e = int(match.group(2))
                start = s
                duration = e - s + 1
            # =========================================================

            all_courses.append({
                "name": course_name,
                "teacher": teacher,
                "weeks": weeks,
                "room": room,
                "day": day,
                "start": start,
                "duration": duration
            })

print(f"🎉 成功！不仅拿到了课，连坐标都挖出来了！总计 {len(all_courses)} 条记录。")
# 打印前三门课看看
print(json.dumps(all_courses[:3], indent=4, ensure_ascii=False))