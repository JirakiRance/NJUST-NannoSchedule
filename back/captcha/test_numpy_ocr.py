"""
纯 numpy 模型推理测试脚本
验证训练好的模型在真实登录中的准确率
依赖：numpy, pillow, requests
"""

import numpy as np
import requests
import time
import os
from PIL import Image
import io

# ===================== 配置 =====================
MODEL_PATH = "captcha_model.npz"
OCR_TEST_ROUNDS = 20

USERNAME = input("请输入学号: ").strip()
PASSWORD = input("请输入密码: ").strip()

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'}
NO_PROXY = {"http": None, "https": None}
LOGIN_URL   = "http://202.119.81.113:8080/Logon.do?method=logon"
CAPTCHA_URL = "http://202.119.81.113:8080/verifycode.servlet"

# ===================== 纯 numpy OCR 推理引擎 =====================
class NumpyOcr:
    def __init__(self, model_path):
        data = np.load(model_path, allow_pickle=True)
        self.W1 = data['W1']
        self.b1 = data['b1']
        self.W2 = data['W2']
        self.b2 = data['b2']
        self.charset = list(data['charset'])
        self.img_h   = int(data['img_h'])
        self.img_w   = int(data['img_w'])
        self.num_chars = int(data['num_chars'])
        self.num_classes = len(self.charset)
        print(f"[*] 模型加载成功！字符集: {self.charset}")
        print(f"[*] 图片尺寸: {self.img_h}x{self.img_w}，字符数: {self.num_chars}")

    def classification(self, img_bytes: bytes) -> str:
        img = Image.open(io.BytesIO(img_bytes)).convert("L").resize((self.img_w, self.img_h))
        x = np.array(img, dtype=np.float32).flatten() / 255.0  # (1364,)
        x = x.reshape(1, -1)

        # 前向传播
        z1 = x @ self.W1 + self.b1
        a1 = np.maximum(0, z1)
        z2 = a1 @ self.W2 + self.b2  # (1, 40)

        # 解码
        result = ""
        for i in range(self.num_chars):
            idx = np.argmax(z2[0, i*self.num_classes:(i+1)*self.num_classes])
            result += self.charset[idx]
        return result

# ===================== 测试流程 =====================
def is_login_success(text):
    return any(k in text for k in ["退出", "欢迎", "个人信息", "修改密码"])

def sep(title):
    print(f"\n{'='*55}\n  {title}\n{'='*55}")

if not os.path.exists(MODEL_PATH):
    print(f"❌ 找不到模型文件 {MODEL_PATH}，请先运行 train_model.py")
    exit(1)

ocr = NumpyOcr(MODEL_PATH)

sep(f"纯 numpy OCR 实际登录测试（{OCR_TEST_ROUNDS} 轮）")
results = []

for i in range(1, OCR_TEST_ROUNDS + 1):
    print(f"\n  --- 第 {i}/{OCR_TEST_ROUNDS} 轮 ---")
    session = requests.Session()
    try:
        cap_resp = session.get(CAPTCHA_URL, headers=HEADERS, timeout=10, proxies=NO_PROXY)
        cap_bytes = cap_resp.content

        t0 = time.time()
        text = ocr.classification(cap_bytes)
        ms = (time.time() - t0) * 1000

        print(f"    识别结果: [{text}]  耗时: {ms:.1f}ms")

        resp = session.post(LOGIN_URL, data={
            'USERNAME': USERNAME, 'PASSWORD': PASSWORD,
            'useDogCode': '', 'RANDOMCODE': text
        }, headers=HEADERS, timeout=10, proxies=NO_PROXY, allow_redirects=True)
        resp.encoding = 'utf-8'

        ok = is_login_success(resp.text)
        print(f"    登录结果: {'✅ 成功' if ok else '❌ 失败'}")
        results.append((text, ok))

    except Exception as e:
        print(f"    异常: {e}")
        results.append(("ERROR", False))

    time.sleep(1.2)

sep("统计结果")
success = sum(1 for _, ok in results if ok)
print(f"  成功率: {success}/{OCR_TEST_ROUNDS} = {success/OCR_TEST_ROUNDS*100:.1f}%")
print(f"\n  详细:")
for i, (text, ok) in enumerate(results, 1):
    print(f"    第{i:02d}轮: {'✅' if ok else '❌'}  [{text}]")

if success / OCR_TEST_ROUNDS >= 0.75:
    print(f"\n  🎉 准确率达标！可以替代 ddddocr 打包进 APK")
    print(f"  下一步：把 captcha_model.npz 复制到 back/core/ 目录")
    print(f"          运行 build_ocr_engine.py 生成最终的 ocr_engine.py")
else:
    print(f"\n  ⚠️  准确率偏低，建议：")
    print(f"      1. 增加训练数据（再跑一次 collect_captcha.py 采集更多）")
    print(f"      2. 增加 EPOCHS 到 50")
    print(f"      3. 增加 hidden_dim 到 512")