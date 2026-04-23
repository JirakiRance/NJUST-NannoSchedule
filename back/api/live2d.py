import os
import json
import zipfile
import shutil
import sys
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

router = APIRouter()

IS_ANDROID = hasattr(sys, 'getandroidapilevel')

if IS_ANDROID:
    # 手机端：由于 front 被打包成只读的 APK assets，必须使用沙盒隔离
    app_dir = os.environ.get("HOME", ".")
    MODELS_DIR = os.path.join(app_dir, "nanno_live2d_models")
    os.makedirs(MODELS_DIR, exist_ok=True)
    # 安卓中，文件层级被压扁了，api 的上一层就是和 front 平级的目录
    ORIGINAL_MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "front", "js", "components", "sniffer_views", "models")
else:
    # 动态计算绝对路径：当前文件是 back/api/live2d.py，退三层就是项目根目录
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    MODELS_DIR = os.path.join(BASE_DIR, "front", "js", "components", "sniffer_views", "models")
    ORIGINAL_MODELS_DIR = MODELS_DIR  # 电脑端没有沙盒，读写都在一个地方

INDEX_PATH = os.path.join(MODELS_DIR, "index.json")


@router.post("/upload_live2d")
async def upload_live2d(model_zip: UploadFile = File(...)):
    """处理上传的 ZIP 包，自动解压并部署 Live2D 模型"""

    # 1. 确定模型ID和目标文件夹
    original_filename = model_zip.filename
    model_id = os.path.splitext(original_filename)[0]
    target_dir = os.path.join(MODELS_DIR, model_id)

    # 清理旧同名文件夹并创建新文件夹
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir)
    os.makedirs(target_dir, exist_ok=True)

    # 2. 将上传的文件保存到本地临时文件并解压
    temp_zip_path = os.path.join(target_dir, original_filename)
    try:
        with open(temp_zip_path, "wb") as buffer:
            shutil.copyfileobj(model_zip.file, buffer)

        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
            zip_ref.extractall(target_dir)
    except Exception as e:
        shutil.rmtree(target_dir)
        return {"success": False, "message": f"解压失败: {str(e)}"}
    finally:
        # 删除原始压缩包
        if os.path.exists(temp_zip_path):
            os.remove(temp_zip_path)

    # 3. 递归寻找核心 JSON 文件 (.model.json 或 .model3.json)
    model_json_path = None
    version = 2
    for root, dirs, files in os.walk(target_dir):
        for file in files:
            if file.endswith(".model.json"):
                model_json_path = os.path.join(root, file)
                version = 2
                break
            elif file.endswith(".model3.json"):
                model_json_path = os.path.join(root, file)
                version = 4
                break
        if model_json_path:
            break

    if not model_json_path:
        shutil.rmtree(target_dir)
        return {"success": False, "message": "压缩包内未找到 .model.json 或 .model3.json 文件，请检查格式！"}

    # 4. 解析模型内部的动作组 (Motions)
    try:
        with open(model_json_path, 'r', encoding='utf-8') as f:
            model_data = json.load(f)

        motions = []
        if version == 2:
            motions = list(model_data.get("motions", {}).keys())
        else:
            motions = list(model_data.get("FileReferences", {}).get("Motions", {}).keys())
    except Exception as e:
        shutil.rmtree(target_dir)
        return {"success": False, "message": f"解析模型 JSON 失败: {str(e)}"}

    # 5. 构建标准化的 config.json
    rel_path = os.path.relpath(model_json_path, MODELS_DIR).replace("\\", "/")
    rel_url = f"./js/components/sniffer_views/models/{rel_path}"
    default_motion = motions[0] if motions else ""

    config = {
        "name": model_id,
        "version": version,
        "isCustom": True,
        "availableMotions": motions,
        "url": rel_url,
        "layout": {"scale": 1.0, "x": 0, "y": 0, "bubbleY": 190}, # 新增刚刚加的气泡高度默认值
        "motions": {
            "alive": default_motion,
            "alert": default_motion,
            "dead": default_motion,
            "interact": default_motion,
            "sleeping": default_motion
        }
    }

    with open(os.path.join(target_dir, "config.json"), "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=4)

    # 6. 更新 index.json 花名册
    if os.path.exists(INDEX_PATH):
        with open(INDEX_PATH, 'r', encoding='utf-8') as f:
            index_data = json.load(f)
    else:
        index_data = []

    # 剔除旧的同名记录，追加新记录
    index_data = [m for m in index_data if m.get("id") != model_id]
    index_data.append({"id": model_id, "name": model_id, "isCustom": True})

    with open(INDEX_PATH, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, indent=4)

    return {"success": True, "modelId": model_id, "config": config, "availableMotions": motions}


# --- 保存修改后的配置 ---
class SaveConfigRequest(BaseModel):
    modelId: str
    config: dict


@router.post("/save_live2d_config")
async def save_live2d_config(req: SaveConfigRequest):
    target_dir = os.path.join(MODELS_DIR, req.modelId)
    config_path = os.path.join(target_dir, "config.json")

    # 防御：如果是在手机端魔改内置模型，先把内置模型拷贝到沙盒里再修改
    if not os.path.exists(target_dir):
        if IS_ANDROID:
            original_target_dir = os.path.join(ORIGINAL_MODELS_DIR, req.modelId)
            if os.path.exists(original_target_dir):
                shutil.copytree(original_target_dir, target_dir)
            else:
                raise HTTPException(status_code=404, detail="Model not found")
        else:
            # 电脑端如果连真实目录里都找不到，那就是真的找不到了
            raise HTTPException(status_code=404, detail="Model not found")

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(req.config, f, ensure_ascii=False, indent=4)

    return {"success": True}


# --- 彻底删除自定义模型 ---
class DeleteModelRequest(BaseModel):
    modelId: str


@router.post("/delete_live2d")
async def delete_live2d(req: DeleteModelRequest):
    target_dir = os.path.join(MODELS_DIR, req.modelId)

    # 1. 物理删除文件夹
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir)

    # 2. 从花名册中除名
    if os.path.exists(INDEX_PATH):
        with open(INDEX_PATH, 'r', encoding='utf-8') as f:
            index_data = json.load(f)

        index_data = [m for m in index_data if m.get("id") != req.modelId]

        with open(INDEX_PATH, 'w', encoding='utf-8') as f:
            json.dump(index_data, f, ensure_ascii=False, indent=4)

    return {"success": True}