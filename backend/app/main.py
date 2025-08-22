from fastapi import FastAPI, Depends, Query, HTTPException
from typing import List
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .crud import query_dataset_ids_and_build_tree, query_images_by_dataset_ids
from .schemas import DatasetTree, ImageOut, ImageRequest, ImagesOut
from fastapi.middleware.cors import CORSMiddleware
from .dataset_analysis.analyze import analyze_fields
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
    # 支持前端传多个字段分析参数
    fields: str = Query("ratio,width_height", description="要分析的字段列表，用逗号分隔")
):
    """
    返回 JSON 分布数据，供前端 Chart 渲染
    每个字段包含 name, labels, counts
    """
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
            else:
                # 可扩展其他字段
                pass

        # 返回 {"ratio_distribution": [...], "size_distribution": [...]}
        data = analyze_fields(analysis_params)

        # 转化成列表形式，方便前端动态渲染
        result = []
        for key, items in data.items():
            result.append({
                "name": key,        # 图表标题
                "data": items       # [{"range": "...", "count": N}, ...]
            })

        return JSONResponse(content={"success": True, "charts": result})

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
