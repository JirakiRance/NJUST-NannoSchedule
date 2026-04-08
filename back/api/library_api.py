from fastapi import APIRouter, HTTPException
import requests
import re
from bs4 import BeautifulSoup
from core.config import HEADERS
from models.schemas import BookSearchRequest, BookDetailRequest

router = APIRouter()

@router.post("/search_books")
def search_books(req: BookSearchRequest):
    search_url = "http://202.119.83.14:8080/uopac/opac/ajax_search_adv.php"
    payload = {
        "searchWords": [{"fieldList": [{"fieldCode": "", "fieldValue": req.keyword}]}],
        "filters": [], "limiter": [], "first": True, "locale": "zh_CN",
        "pageCount": 1, "pageSize": 20, "sortField": "relevance", "sortType": "desc"
    }
    try:
        resp = requests.post(search_url, json=payload, headers=HEADERS, timeout=10)
        resp.encoding = 'utf-8'
        data = resp.json()

        items = data if isinstance(data, list) else (data.get('content') or data.get('resultsList') or data.get('searchResult') or [])
        books = []
        for item in items:
            title_raw = item.get('title', '')
            title = re.sub(r'<[^>]+>', '', title_raw)
            book_id = item.get('marcRecNo', '')
            if not book_id:
                m_id = re.search(r'marc_no=([^"&]+)', title_raw)
                if m_id: book_id = m_id.group(1)

            author = re.sub(r'<[^>]+>', '', item.get('author', '未知作者'))
            pub_str = re.sub(r'<[^>]+>', '', f"{item.get('publisher', '')} {item.get('pubYear', '')}".strip())

            clean_lend = re.sub(r'<[^>]+>', '', item.get('lendAvl', ''))
            total, available = "0", "0"
            if clean_lend:
                m_total = re.search(r'馆藏复本：\s*(\d+)', clean_lend)
                m_avl = re.search(r'可借复本：\s*(\d+)', clean_lend)
                if m_total: total = m_total.group(1)
                if m_avl: available = m_avl.group(1)

            books.append({"id": book_id, "title": title, "author": author, "publisher": pub_str, "total": total, "available": available})
        return {"msg": "成功", "data": books}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索失败: {str(e)}")

@router.post("/book_detail")
def book_detail(req: BookDetailRequest):
    detail_url = f"http://202.119.83.14:8080/uopac/opac/item.php?marc_no={req.id}"
    try:
        resp = requests.get(detail_url, headers=HEADERS, timeout=10)
        resp.encoding = 'utf-8'
        soup = BeautifulSoup(resp.text, 'lxml')

        info = {}
        for dl in soup.find_all('dl', class_='booklist'):
            dt, dd = dl.find('dt'), dl.find('dd')
            if dt and dd:
                info[dt.get_text(strip=True).replace(':', '').replace('：', '')] = dd.get_text(strip=True)

        holdings = []
        tab_item = soup.find('div', id='tab_item')
        if tab_item:
            table = tab_item.find('table', id='item')
            if table:
                for row in table.find_all('tr')[1:]:
                    tds = row.find_all('td')
                    if len(tds) >= 5:
                        holdings.append({
                            "call_no": tds[0].get_text(strip=True), "barcode": tds[1].get_text(strip=True),
                            "location": tds[3].get_text(strip=True).replace('南京校区—', ''),
                            "status": tds[4].get_text(strip=True)
                        })
        return {"msg": "成功", "data": {"info": info, "holdings": holdings}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取详情失败: {str(e)}")