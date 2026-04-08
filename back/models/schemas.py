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