from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import user_api, library_api, public_course_api ,empty_rooms_api
from api.live2d import router as live2d_router

app = FastAPI(title="南理工教务 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册所有路由模块
app.include_router(user_api.router, prefix="/api", tags=["用户同步"])
app.include_router(library_api.router, prefix="/api", tags=["图书馆"])
app.include_router(public_course_api.router, prefix="/api", tags=["蹭课查询"])
app.include_router(empty_rooms_api.router, prefix="/api", tags=["空闲教室"])
app.include_router(live2d_router, prefix="/api", tags=["Live2D"])