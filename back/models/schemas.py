from pydantic import BaseModel

class LoginRequest(BaseModel):
    session_id: str
    username: str
    password: str
    captcha: str

class BookSearchRequest(BaseModel):
    keyword: str

class BookDetailRequest(BaseModel):
    id: str

class PublicCourseRequest(BaseModel):
    session_id: str
    term: str = "2025-2026-2"
    keyword: str

class EmptyRoomRequest(BaseModel):
    session_id: str
    term: str = "2025-2026-2"
    week: str
    day: str
    period_list: list
    building: str = "all"