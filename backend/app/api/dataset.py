from fastapi import APIRouter, Query
from typing import Optional
from app.services.dataset_service import query_samples

router = APIRouter()

@router.get("/datasets/query")
def query_datasets(
    keyword: Optional[str] = Query(None, description="字符串匹配"),
    min_size: Optional[float] = Query(None, description="最小数值"),
    max_size: Optional[float] = Query(None, description="最大数值"),
    is_active: Optional[bool] = Query(None, description="布尔条件"),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量")
):
    total, data = query_samples(keyword, min_size, max_size, is_active, page, size)
    return {"total": total, "page": page, "size": size, "data": [d.dict() for d in data]}
