from pydantic import BaseModel

class LoginRequest(BaseModel):
    session_id: str
    username: str
    password: str
    captcha: str
    term: str
    keep_alive: bool = False

class KeepAliveRequest(BaseModel):
    session_id: str

class SniffDataRequest(BaseModel):
    session_id: str
    term: str

class BookSearchRequest(BaseModel):
    keyword: str

class BookDetailRequest(BaseModel):
    id: str

class PublicCourseRequest(BaseModel):
    session_id: str
    term: str
    keyword: str

class EmptyRoomRequest(BaseModel):
    session_id: str
    term: str
    week: str
    day: str
    period_list: list
    building: str = "all"