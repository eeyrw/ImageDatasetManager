from fastapi import FastAPI, Depends, Query, HTTPException
from typing import List
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime

from .database import get_db
from .crud import query_dataset_ids_and_build_tree, query_images_by_dataset_ids
from .schemas import DatasetTree, ImageOut, ImageRequest, ImagesOut, ImageDeleteRequest, RecycleBinLogOut
from fastapi.middleware.cors import CORSMiddleware
from .dataset_analysis.analyze import analyze_fields
from .models import Image, RecycleBinLog

from meilisearch import Client

MEILI_URL = "http://127.0.0.1:7700"
client = Client(MEILI_URL)
index = client.index("images")

app = FastAPI()

# 允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------- 分析接口保持不变 -------------------

@app.get("/analyze_json")
def analyze_json(fields: str = Query("ratio,width_height", description="要分析的字段列表，用逗号分隔")):
    try:
        field_list = fields.split(",")
        analysis_params = []
        for f in field_list:
            if f == "ratio":
                analysis_params.append({
                    "name": "宽高比分布",
                    "sql_expr": "width::float / height",
                    "min_val": 0,
                    "max_val": 3,
                    "num_buckets": 20,
                    "where_clause": "width IS NOT NULL AND height IS NOT NULL AND height<>0"
                })
            elif f == "size":
                analysis_params.append({
                    "name": "图片尺寸分布",
                    "sql_expr": "sqrt(width::float * height)",
                    "min_val": 0,
                    "max_val": 3000,
                    "num_buckets": 20,
                    "where_clause": "width IS NOT NULL AND height IS NOT NULL"
                })
            elif f == "quality_score":
                analysis_params.append({
                    "name": "图片质量分布",
                    "sql_expr": "quality_score",
                    "min_val": 0,
                    "max_val": 100,
                    "num_buckets": 20,
                    "where_clause": "quality_score IS NOT NULL"
                })
            elif f == "aesthetic_score":
                analysis_params.append({
                    "name": "图片美学分布",
                    "sql_expr": "aesthetic_score",
                    "min_val": 0,
                    "max_val": 10,
                    "num_buckets": 20,
                    "where_clause": "aesthetic_score IS NOT NULL"
                })
            elif f == "aesthetic_eat":
                analysis_params.append({
                    "name": "图片美学2分布",
                    "sql_expr": "aesthetic_eat",
                    "min_val": 0,
                    "max_val": 10,
                    "num_buckets": 20,
                    "where_clause": "aesthetic_eat IS NOT NULL"
                })
        data = analyze_fields(analysis_params)
        result = [{"name": key, "data": items} for key, items in data.items()]
        return JSONResponse(content={"success": True, "charts": result})
    except Exception as e:
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500)

# ------------------- Dataset tree -------------------

@app.get("/api/datasets/tree", response_model=List[DatasetTree])
async def get_dataset_tree(db: AsyncSession = Depends(get_db)):
    return await query_dataset_ids_and_build_tree(db)

# ------------------- 图片列表 -------------------

@app.post("/api/images", response_model=ImagesOut)
async def get_images(req: ImageRequest, db: AsyncSession = Depends(get_db)):
    return await query_images_by_dataset_ids(db, req.ids, req.page, req.pageSize)

# ------------------- 回收站接口 -------------------

@app.get("/images/", response_model=List[ImageOut])
async def list_images(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Image).where(Image.is_deleted == False))
    return result.scalars().all()

@app.get("/images/recycle_bin_log", response_model=List[RecycleBinLogOut])
async def list_recycle_bin_log(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RecycleBinLog))
    return result.scalars().all()

@app.get("/images/recycle_bin", response_model=List[ImageOut])
async def list_recycle_bin(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Image).where(Image.is_deleted == True))
    return result.scalars().all()


# 删除接口
@app.post("/images/{image_id}/delete")
async def delete_image(image_id: UUID, data: ImageDeleteRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Image).where(Image.id == image_id))
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    image.is_deleted = True
    image.deleted_at = datetime.utcnow()
    image.deleted_by = data.deleted_by

    await db.commit()

    # 同步到 Meilisearch
    index.update_documents([{
        "id": str(image.id),
        "is_deleted": True,
        "deleted_by": data.deleted_by
    }])

    return {"message": "Image moved to recycle bin"}

# 恢复接口类似
@app.post("/images/{image_id}/restore")
async def restore_image(image_id: UUID, data: ImageDeleteRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Image).where(Image.id == image_id))
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    image.is_deleted = False
    image.deleted_at = None
    image.deleted_by = data.deleted_by

    await db.commit()

    index.update_documents([{
        "id": str(image.id),
        "is_deleted": False,
        "deleted_by": data.deleted_by
    }])

    return {"message": "Image restored"}