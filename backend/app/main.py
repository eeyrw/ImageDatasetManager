from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .mock_data import dataset_tree, favourites, generate_images_for_ids

from pydantic import BaseModel
from typing import List, Literal

class ImageRequest(BaseModel):
    collection: Literal["dataset", "favourite"]
    ids: List[str]
    page: int = 0
    size: int = 20


app = FastAPI()

# 允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 或指定 localhost:5173 等
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    return generate_images_for_ids(req.ids, req.page, req.size)
