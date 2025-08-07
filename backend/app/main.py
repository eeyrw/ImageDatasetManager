import json
import os
from pathlib import Path
import threading
import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .mock_data import dataset_tree_mock, favourites, generate_images_for_ids

from pydantic import BaseModel
from typing import List, Literal

from .scan_image_dir import scan_directory
from .GetDatasets import MultiDatasets
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

ROOT_DIR = Path("/mnt/yuansnas/Backup/big_server/ds/DiffusionDataset")
IMAGE_DIR = Path("/mnt/yuansnas/Backup/big_server/ds/DiffusionDataset/illustration")

IMGPROXY_URL = "http://localhost:8082"
IMGPROXY_PATH_PREFIX = "/insecure/width:300/plain/local://"


uuid_dataset_json_map = {}
dataset_tree = {}
multiDataset = []
imageInfoCache = {}
all_images_lock = threading.Lock()


def gen_dataset_tree(multiDataset,uuid_dataset_json_map):
    # 使用固定命名空间，确保每次生成的 UUID 一致
    NAMESPACE = uuid.UUID("12345678-1234-5678-1234-567812345678")

    def generate_uuid(path: str) -> str:
        return str(uuid.uuid5(NAMESPACE, path))

    def insert_path(root, path_parts):
        current_level = root
        path_so_far = ""

        for part in path_parts:
            path_so_far += "/" + part
            # 查找是否已有该节点
            found = next((child for child in current_level if child["name"] == part), None)
            if not found:
                new_node = {
                    "id": generate_uuid(path_so_far),
                    "name": part,
                    "children": []
                }
                uuid_dataset_json_map[new_node['id']] = path_so_far
                current_level.append(new_node)
                found = new_node
            current_level = found.setdefault("children", [])

    def build_tree(paths):
        tree = []
        for path in paths:
            path = Path(os.path.dirname(path))
            path = path.relative_to(multiDataset.topDir).as_posix()
            parts = path.strip("/").split("/")
            insert_path(tree, parts)
        return tree

    # 构建树
    tree = build_tree(multiDataset.dirsHasImageInfoJson)
    return tree


def load_all_images():
    global multiDataset
    global dataset_tree
    global uuid_dataset_json_map

    multiDataset_ = MultiDatasets(IMAGE_DIR)
    uuid_dataset_json_map_ = {}
    multiDataset_.scanDir()
    dataset_tree_ = gen_dataset_tree(multiDataset_,uuid_dataset_json_map_)
    with all_images_lock:
        multiDataset = multiDataset_
        dataset_tree = dataset_tree_
        uuid_dataset_json_map = uuid_dataset_json_map_

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
        images = []
        if id not in imageInfoCache.keys():
            imageInfoJsonDir= uuid_dataset_json_map[id].strip("/")
            imageInfoFilePath = IMAGE_DIR/Path(imageInfoJsonDir)/Path('ImageInfo.json')
            if os.path.isfile(imageInfoFilePath):
                with open(imageInfoFilePath, 'r', encoding='utf8') as f:
                    imageInfoList = json.load(f)
                for imageInfo in imageInfoList:
                    mid_path = IMAGE_DIR.relative_to(ROOT_DIR)
                    rel_path = mid_path/Path(imageInfoJsonDir)/Path(imageInfo['IMG'])
                    url = f"{IMGPROXY_URL}{IMGPROXY_PATH_PREFIX}/{rel_path.as_posix().replace("#", "%23")}@webp"
                    images.append({
                        "id":str(uuid.uuid4()),
                        "path":str(rel_path),
                        "url": url,
                        "title": imageInfo['HQ_CAP'][0] if 'HQ_CAP' in imageInfo.keys() else None,
                        "tags": imageInfo['DBRU_TAG'].split(','),
                        "width":imageInfo['W'],
                        "height":imageInfo['H']
                    })
                imageInfoCache[id] = images
                all_images.extend(imageInfoCache[id])
            else:
                print(f'Fail to read {imageInfoFilePath}.')
                continue
        else:
            all_images.extend(imageInfoCache[id])
    start = req.page * req.pageSize
    end = start + req.pageSize
    return {
        "total": len(all_images),
        "images": all_images[start:end]
    }

@app.post("/api/images/refresh")
def refresh_images():
    threading.Thread(target=load_all_images).start()
    return {"message": "Started refreshing images in background."}