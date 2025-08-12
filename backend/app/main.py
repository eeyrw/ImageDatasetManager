from fastapi import FastAPI, Depends, Query, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .crud import query_dataset_ids_and_build_tree, query_images_by_dataset_ids
from .schemas import DatasetTree, ImageOut, ImageRequest, ImagesOut
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 或指定 localhost:5173 等
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/datasets/tree", response_model=List[DatasetTree])
async def get_dataset_tree(db: AsyncSession = Depends(get_db)):
    return await query_dataset_ids_and_build_tree(db)

@app.post("/api/images", response_model=ImagesOut)
async def get_images(
    req: ImageRequest,
    db: AsyncSession = Depends(get_db)
):
    return await query_images_by_dataset_ids(db, req.ids, req.page, req.pageSize)