# 存放所有的全局常量、请求头、URL和内存中的 Session
import requests

DEBUG = False

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
}

LOGIN_URL = "http://202.119.81.113:8080/Logon.do?method=logon"
CAPTCHA_URL = "http://202.119.81.113:8080/verifycode.servlet"
SCHEDULE_URL = "http://202.119.81.112:9080/njlgdx/xskb/xskb_list.do?Ves632DSdyV=NEW_XSD_PYGL"
GRADES_LIST_URL = "http://202.119.81.112:9080/njlgdx/kscj/cjcx_list"
EXAMS_LIST_URL = "http://202.119.81.112:9080/njlgdx/xsks/xsksap_list"
LEVEL_EXAMS_URL = "http://202.119.81.112:9080/njlgdx/kscj/djkscj_list"

# 全局存储用户会话的字典
session_store = {}