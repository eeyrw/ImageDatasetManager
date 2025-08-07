from pathlib import Path
import threading
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .mock_data import dataset_tree_mock, favourites, generate_images_for_ids

from pydantic import BaseModel
from typing import List, Literal

from .scan_image_dir import scan_directory

class ImageRequest(BaseModel):
    collection: Literal["dataset", "favourite"]
    ids: List[str]
    page: int = 0
    pageSize: int = 20


app = FastAPI()

# 允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 或指定 localhost:5173 等
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT_DIR = Path(r"C:\illustration")
images_uuid_map = {}
dataset_tree = {}
all_images_lock = threading.Lock()

def load_all_images():
    global dataset_tree
    global images_uuid_map
    uuid_map = {}
    tree = scan_directory(ROOT_DIR, uuid_map)
    with all_images_lock:
        images_uuid_map = uuid_map
        dataset_tree = [tree]
    print(f"Loaded {len(uuid_map)} images.")

load_all_images()

@app.get("/api/datasets/tree")
def get_dataset_tree():
    return dataset_tree

@app.get("/api/favourites")
def get_favourites():
    return favourites

@app.post("/api/images")
def get_images(req: ImageRequest):
    if not req.ids:
        return {"total": 0, "images": []}
    
    all_images = []
    for id in req.ids:
        for img in images_uuid_map[id]['images']:
            url = Path(images_uuid_map[id]['path'])/Path(img)
            all_images.append({
                "id": f"{id}_{id}",
                "url": url,
                "title": f"图像 {id} (来源 {id})"
            })
    start = req.page * req.pageSize
    end = start + req.pageSize
    return {
        "total": len(all_images),
        "images": all_images[start:end]
    }
