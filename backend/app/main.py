from fastapi import FastAPI, Depends, Query, HTTPException
from typing import List
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .crud import query_dataset_ids_and_build_tree, query_images_by_dataset_ids
from .schemas import DatasetTree, ImageOut, ImageRequest, ImagesOut
from fastapi.middleware.cors import CORSMiddleware
from .dataset_analysis.analyze import analyze
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

app = FastAPI()

# 允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 或指定 localhost:5173 等
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/analyze_json")
def analyze_json(
    # 宽高比参数
    ratio_min: float = Query(0.0, description="宽高比最小值"),
    ratio_max: float = Query(3.0, description="宽高比最大值"),
    ratio_buckets: int = Query(30, description="宽高比桶数量"),
    # 图片尺寸参数
    size_min: float = Query(0.0, description="尺寸最小值"),
    size_max: float = Query(3000.0, description="尺寸最大值"),
    size_buckets: int = Query(50, description="尺寸桶数量")
):
    """
    返回 JSON 分布数据，供前端 Chart 渲染
    """
    try:
        data = analyze(
            ratio_min=ratio_min,
            ratio_max=ratio_max,
            ratio_buckets=ratio_buckets,
            size_min=size_min,
            size_max=size_max,
            size_buckets=size_buckets
        )
        return JSONResponse(content={"success": True, **data})
    except Exception as e:
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500)


@app.get("/api/datasets/tree", response_model=List[DatasetTree])
async def get_dataset_tree(db: AsyncSession = Depends(get_db)):
    return await query_dataset_ids_and_build_tree(db)

@app.post("/api/images", response_model=ImagesOut)
async def get_images(
    req: ImageRequest,
    db: AsyncSession = Depends(get_db)
):
    return await query_images_by_dataset_ids(db, req.ids, req.page, req.pageSize)