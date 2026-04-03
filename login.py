import requests
import  os

def login_jwc(username, password):
    # 1. 创建一个 Session 对象，它会自动帮我们管理和维持 Cookie
    session = requests.Session()

    # 伪装成正常的 Edge 浏览器，防止被服务器识别为爬虫拦截
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
    }

    # ================= 需要你补充的两个 URL =================
    # 登录提交数据的真实地址 (Request URL)
    login_url = "http://202.119.81.113:8080/Logon.do?method=logon"
    # 验证码图片的真实地址
    captcha_url = "http://202.119.81.113:8080/verifycode.servlet"
    # ========================================================

    try:
        # 2. 先去请求一次验证码图片，这一步不仅是为了看图片，更重要的是让服务器给我们发一个初始 Cookie
        print("正在获取验证码...")
        captcha_response = session.get(captcha_url, headers=headers)

        # 将验证码图片保存到本地，方便我们手动查看并输入
        with open('captcha.jpg', 'wb') as f:
            f.write(captcha_response.content)

        random_code = input("验证码已保存为 captcha.jpg，请打开查看并在此输入验证码: ")

        # 3. 构造我们刚才抓包抓到的 Payload (表单数据)
        login_data = {
            'USERNAME': username,
            'PASSWORD': password,
            'useDogCode': '',  # 保持为空
            'RANDOMCODE': random_code
        }

        # 4. 带着表单数据和刚刚存下 Cookie 的 Session，向服务器发起猛烈的 POST 登录请求！
        print("正在尝试登录...")
        response = session.post(login_url, data=login_data, headers=headers)

        # 5. 验证是否登录成功 (通常登录成功后，页面会跳转或者包含特定的欢迎文字)
        response.encoding = 'utf-8'  # 防止中文乱码
        if "退出" in response.text or "欢迎" in response.text or "个人信息" in response.text:
            print("🎉 登录成功！Cookie 已获取！")
            return session  # 把带着登录凭证的 session 返回，后面查课表全靠它
        else:
            print("❌ 登录失败，请检查账号密码或验证码。")
            return None

    except Exception as e:
        print(f"发生网络错误: {e}")
        return None


# 测试运行
if __name__ == "__main__":
    my_session = login_jwc("923113370211", "923113370211")

    # === 确保这部分代码在 if my_session: 这个判断条件里面 ===
    if my_session:
        print("门禁卡有效，准备获取课表！")

        # 【填空】把你刚才找到的课表页面真实 URL 填在这里
        schedule_url = "http://202.119.81.112:9080/njlgdx/xskb/xskb_list.do?Ves632DSdyV=NEW_XSD_PYGL"

        print("正在拉取课表数据...")
        # 见证奇迹：用带着登录凭证的 my_session 直接去获取课表网页
        response_kb = my_session.get(schedule_url)
        response_kb.encoding = 'utf-8'  # 防止中文乱码

        # 我们先把抓到的整个网页源码保存成一个 HTML 文件，看看长什么样
        current_dir = os.path.dirname(os.path.abspath(__file__))
        html_path = os.path.join(current_dir, 'schedule.html')

        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(response_kb.text)

        print(f"✅ 成功！课表网页源码已经保存到这里啦: {html_path}")
        print("快去你的电脑文件夹里双击打开 schedule.html 看看！")