"""
南理工教务系统登录测试脚本
测试两个方案：
  方案A：空验证码绕过
  方案B：ddddocr 自动识别验证码（多次测试准确率）
"""

import requests
import base64
import ddddocr
import time
import os
from urllib.parse import urlparse

# ===================== 配置区 =====================
USERNAME = input("请输入学号: ").strip()
PASSWORD = input("请输入密码: ").strip()

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
}
NO_PROXY = {"http": None, "https": None}

LOGIN_URL    = "http://202.119.81.113:8080/Logon.do?method=logon"
CAPTCHA_URL  = "http://202.119.81.113:8080/verifycode.servlet"
SCHEDULE_URL = "http://202.119.81.112:9080/njlgdx/xskb/xskb_list.do?Ves632DSdyV=NEW_XSD_PYGL"

OCR_TEST_ROUNDS = 10   # OCR 方案测试轮数
SAVE_CAPTCHA_DIR = "captcha_samples"  # 验证码图片保存目录（方便肉眼核对）

os.makedirs(SAVE_CAPTCHA_DIR, exist_ok=True)
ocr = ddddocr.DdddOcr(show_ad=False)

# ===================== 工具函数 =====================

def is_login_success(resp_text: str) -> bool:
    return any(k in resp_text for k in ["退出", "欢迎", "个人信息", "修改密码"])

def get_captcha(session: requests.Session) -> tuple[bytes, str]:
    """获取验证码图片字节 + base64 字符串"""
    resp = session.get(CAPTCHA_URL, headers=HEADERS, timeout=10, proxies=NO_PROXY)
    return resp.content, base64.b64encode(resp.content).decode()

def try_login(session: requests.Session, captcha_text: str) -> requests.Response:
    login_data = {
        'USERNAME': USERNAME,
        'PASSWORD': PASSWORD,
        'useDogCode': '',
        'RANDOMCODE': captcha_text
    }
    resp = session.post(LOGIN_URL, data=login_data, headers=HEADERS,
                        timeout=10, proxies=NO_PROXY, allow_redirects=True)
    resp.encoding = 'utf-8'
    return resp

def verify_session(session: requests.Session) -> bool:
    """登录后访问课表页，确认 Session 真正有效"""
    try:
        resp = session.post(SCHEDULE_URL, data={'xnxq01id': '', 'zc': ''},
                            headers=HEADERS, timeout=10, proxies=NO_PROXY)
        resp.encoding = 'utf-8'
        # 课表页包含"课程"或表格标签，登录页包含"登录"
        return "课程" in resp.text or "<table" in resp.text.lower()
    except Exception as e:
        print(f"    [Session验证] 请求异常: {e}")
        return False

def print_sep(title: str):
    print(f"\n{'='*55}")
    print(f"  {title}")
    print(f"{'='*55}")

# ===================== 方案 A：空验证码 =====================

def test_empty_captcha():
    print_sep("方案 A：空验证码绕过测试")

    for attempt in ["空字符串", "0", "0000", "1234"]:
        session = requests.Session()
        print(f"\n  尝试 RANDOMCODE='{attempt}' ...")
        try:
            # 先访问验证码地址初始化 Cookie（有些系统要求先拿 Cookie）
            get_captcha(session)
            resp = try_login(session, attempt if attempt != "空字符串" else "")
            success = is_login_success(resp.text)
            print(f"    登录响应长度: {len(resp.text)} 字符")
            print(f"    最终 URL: {resp.url}")
            print(f"    登录结果: {'✅ 成功！' if success else '❌ 失败'}")
            if success:
                print(f"    验证 Session 有效性...")
                valid = verify_session(session)
                print(f"    Session 实际可用: {'✅ 是' if valid else '❌ 否（假登录）'}")
                if valid:
                    print(f"\n  🎉 方案A可行！RANDOMCODE='{attempt}' 可绕过验证码！")
                    return True
        except Exception as e:
            print(f"    请求异常: {e}")
        time.sleep(1)

    print("\n  ❌ 方案A全部失败，验证码无法绕过")
    return False


# ===================== 方案 B：OCR 自动识别 =====================

def test_ocr_captcha():
    print_sep(f"方案 B：ddddocr OCR 识别测试（共 {OCR_TEST_ROUNDS} 轮）")

    results = []  # [(ocr_text, actual_success, saved_path)]

    for i in range(1, OCR_TEST_ROUNDS + 1):
        print(f"\n  --- 第 {i}/{OCR_TEST_ROUNDS} 轮 ---")
        session = requests.Session()
        try:
            cap_bytes, cap_b64 = get_captcha(session)

            # 保存验证码图片供肉眼核对
            img_path = os.path.join(SAVE_CAPTCHA_DIR, f"cap_{i:02d}.jpg")
            with open(img_path, "wb") as f:
                f.write(cap_bytes)

            # OCR 识别
            t0 = time.time()
            ocr_text = ocr.classification(cap_bytes).strip()
            elapsed = (time.time() - t0) * 1000

            print(f"    OCR识别结果: [{ocr_text}]  耗时: {elapsed:.0f}ms  图片: {img_path}")

            # 尝试登录
            resp = try_login(session, ocr_text)
            success = is_login_success(resp.text)
            print(f"    登录结果: {'✅ 成功' if success else '❌ 失败（验证码识别错误或密码问题）'}")

            if success:
                valid = verify_session(session)
                print(f"    Session 实际可用: {'✅ 是' if valid else '❌ 否'}")
                results.append((ocr_text, valid, img_path))
            else:
                results.append((ocr_text, False, img_path))

        except Exception as e:
            print(f"    异常: {e}")
            results.append(("ERROR", False, ""))

        time.sleep(1.2)  # 别打太快，避免被封

    # 统计
    print_sep("方案 B 统计结果")
    success_count = sum(1 for _, ok, _ in results if ok)
    print(f"  总轮次: {OCR_TEST_ROUNDS}")
    print(f"  成功次数: {success_count}")
    print(f"  成功率: {success_count / OCR_TEST_ROUNDS * 100:.1f}%")
    print(f"\n  验证码图片已保存至 ./{SAVE_CAPTCHA_DIR}/ 目录，可对照肉眼检查识别错误原因")
    print(f"\n  详细结果:")
    for i, (text, ok, path) in enumerate(results, 1):
        status = "✅" if ok else "❌"
        print(f"    第{i:02d}轮: {status}  识别=[{text}]  {os.path.basename(path)}")

    return success_count, OCR_TEST_ROUNDS


# ===================== 主流程 =====================

if __name__ == "__main__":
    print(f"\n目标系统: {LOGIN_URL}")
    print(f"测试账号: {USERNAME}")

    # 先测方案A
    a_ok = test_empty_captcha()

    # 再测方案B
    b_success, b_total = test_ocr_captcha()

    # 最终建议
    print_sep("测试总结与建议")
    if a_ok:
        print("  🏆 推荐方案A（空验证码）：零依赖、速度最快、无需OCR")
        print("     自动重登逻辑：直接 POST 登录，RANDOMCODE 留空即可")
    elif b_success / b_total >= 0.80:
        print(f"  🏆 推荐方案B（OCR）：准确率 {b_success/b_total*100:.0f}%，加重试逻辑可达到生产可用")
        print("     建议：识别失败时自动重试，最多3次")
    elif b_success / b_total >= 0.50:
        print(f"  ⚠️  方案B准确率偏低（{b_success/b_total*100:.0f}%），需要结合重试+更换OCR模型")
        print("     可以尝试 cnocr 或在线OCR API作为备选")
    else:
        print("  ❌ 两个方案均不理想，建议检查账号密码是否正确，或验证码类型较复杂")
        print("     查看 captcha_samples/ 里的图片，确认验证码格式")