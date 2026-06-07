"""
验证码自动采集 + 标注脚本
原理：ddddocr 识别 → 登录验证 → 成功才保存，失败丢弃
目标：收集 500~1000 个 100% 准确的标注样本
"""

import requests
import ddddocr
import time
import os
import json
from PIL import Image
import io

# ===================== 配置区 =====================
USERNAME = input("请输入学号: ").strip()
PASSWORD = input("请输入密码: ").strip()

TARGET_COUNT = 500       # 目标采集数量
SAVE_DIR = "captcha_dataset"  # 保存目录
DELAY = 1.2              # 每轮间隔秒数，别太快被封

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'}
NO_PROXY = {"http": None, "https": None}
LOGIN_URL   = "http://202.119.81.113:8080/Logon.do?method=logon"
CAPTCHA_URL = "http://202.119.81.113:8080/verifycode.servlet"

# ===================== 初始化 =====================
os.makedirs(SAVE_DIR, exist_ok=True)
labels_path = os.path.join(SAVE_DIR, "labels.json")

# 加载已有标签（支持断点续采）
if os.path.exists(labels_path):
    with open(labels_path, "r") as f:
        labels = json.load(f)
    print(f"[*] 发现已有数据集，已采集 {len(labels)} 张，继续采集...")
else:
    labels = {}
    print(f"[*] 新建数据集，目标采集 {TARGET_COUNT} 张")

ocr = ddddocr.DdddOcr(show_ad=False)

# ===================== 工具函数 =====================
def is_login_success(text):
    return any(k in text for k in ["退出", "欢迎", "个人信息", "修改密码"])

def save_labels():
    with open(labels_path, "w") as f:
        json.dump(labels, f, ensure_ascii=False, indent=2)

# ===================== 主采集循环 =====================
success_count = len(labels)
attempt_count = 0
fail_streak = 0  # 连续失败计数，防止账号被锁

print(f"\n开始采集，目标: {TARGET_COUNT} 张\n{'='*50}")

while success_count < TARGET_COUNT:
    attempt_count += 1
    session = requests.Session()

    try:
        # 1. 获取验证码
        cap_resp = session.get(CAPTCHA_URL, headers=HEADERS, timeout=10, proxies=NO_PROXY)
        cap_bytes = cap_resp.content

        # 2. OCR 识别
        text = ocr.classification(cap_bytes).strip()

        # 3. 尝试登录验证
        login_resp = session.post(LOGIN_URL, data={
            'USERNAME': USERNAME, 'PASSWORD': PASSWORD,
            'useDogCode': '', 'RANDOMCODE': text
        }, headers=HEADERS, timeout=10, proxies=NO_PROXY, allow_redirects=True)
        login_resp.encoding = 'utf-8'

        if is_login_success(login_resp.text):
            # 4. 登录成功：保存图片 + 标签
            filename = f"{success_count:05d}_{text}.jpg"
            filepath = os.path.join(SAVE_DIR, filename)

            # 转为标准灰度图保存（统一格式）
            img = Image.open(io.BytesIO(cap_bytes)).convert("L")
            img.save(filepath)

            labels[filename] = text
            success_count += 1
            fail_streak = 0

            print(f"  [{success_count:4d}/{TARGET_COUNT}] ✅  [{text}]  → {filename}")

            # 每50张保存一次标签文件
            if success_count % 50 == 0:
                save_labels()
                print(f"\n  💾 已保存进度 ({success_count} 张)\n")
        else:
            fail_streak += 1
            print(f"  [尝试{attempt_count:4d}] ❌  [{text}]  识别失败，丢弃")

            # 连续失败10次，暂停30秒防封
            if fail_streak >= 10:
                print(f"\n  ⚠️  连续失败 {fail_streak} 次，暂停 30 秒冷却...\n")
                time.sleep(30)
                fail_streak = 0

    except Exception as e:
        print(f"  [尝试{attempt_count:4d}] 💥  异常: {e}")
        time.sleep(3)

    time.sleep(DELAY)

# 最终保存
save_labels()

# ===================== 统计 =====================
print(f"\n{'='*50}")
print(f"采集完成！")
print(f"  总尝试次数: {attempt_count}")
print(f"  成功采集:   {success_count} 张")
print(f"  实际成功率: {success_count/attempt_count*100:.1f}%")
print(f"  数据保存在: ./{SAVE_DIR}/")
print(f"\n字符分布统计:")

# 统计字符分布
char_count = {}
for label in labels.values():
    for c in label:
        char_count[c] = char_count.get(c, 0) + 1
for c in sorted(char_count.keys()):
    bar = "█" * (char_count[c] // 10)
    print(f"  '{c}': {char_count[c]:4d}  {bar}")

print(f"\n下一步：运行 train_model.py 训练模型")