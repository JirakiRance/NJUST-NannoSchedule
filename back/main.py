from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from api import user_api, library_api, public_course_api, empty_rooms_api
from api.live2d import router as live2d_router

import os
import shutil
import traceback
import uvicorn

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

# ====== 智能路径探测 (兼容 PyCharm 和 安卓) ======
current_dir = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(current_dir) == "back":
    # PyCharm 开发环境
    front_dir = os.path.join(os.path.dirname(current_dir), "front")
    app_dir = os.path.dirname(current_dir)
else:
    # 安卓生产环境
    front_dir = os.path.join(current_dir, "front")
    app_dir = os.environ.get("HOME", current_dir)

# ====== 核心：Live2D 动态目录读写分离 ======
writable_models_dir = os.path.join(app_dir, "nanno_live2d_models")
original_models_dir = os.path.join(front_dir, "js", "components", "sniffer_views", "models")
os.makedirs(writable_models_dir, exist_ok=True)

# 1. 轻量化初始化：只拷贝 1KB 的花名册 index.json，绝不拷贝大文件防卡顿！
writable_index = os.path.join(writable_models_dir, "index.json")
original_index = os.path.join(original_models_dir, "index.json")

try:
    if not os.path.exists(writable_index) and os.path.exists(original_index):
        shutil.copyfile(original_index, writable_index)
except Exception as e:
    print(f"初始化模型花名册失败: {e}")

# 2. 路由劫持：拦截前端所有的模型文件请求
@app.get("/js/components/sniffer_views/models/{file_path:path}")
async def serve_model_files(file_path: str):
    # 优先寻找沙盒可写目录（用户导入的新模型或修改的配置）
    custom_path = os.path.join(writable_models_dir, file_path)
    if os.path.exists(custom_path):
        return FileResponse(custom_path)

    # 找不到再去内置只读目录里找（原版猪猪）
    builtin_path = os.path.join(original_models_dir, file_path)
    if os.path.exists(builtin_path):
        return FileResponse(builtin_path)

    raise HTTPException(status_code=404, detail="Model file not found")

# 3. 挂载常规前端文件 (注意：挂载操作必须写在精确路由的后面)
if os.path.exists(front_dir):
    app.mount("/", StaticFiles(directory=front_dir, html=True), name="front")
else:
    print(f"找不到前端静态文件夹，预期路径: {front_dir}")

def start_server():
    print("启动后端服务器...")
    try:
        uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)
    except SystemExit as e:
        print(f"Uvicorn 退出: {e}")
    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    start_server()