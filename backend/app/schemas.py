from __future__ import annotations
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime

# ---------- Pydantic ----------

class DatasetTree(BaseModel):
    id: UUID
    name: str
    children: Optional[List[DatasetTree]]

class ImageSize(BaseModel):
    w: Optional[int]
    h: Optional[int]

class ImageOut(BaseModel):
    id: UUID
    path: str
    url: Optional[str]
    raw_size_image_url: Optional[str]
    title: Optional[str]
    tags: Optional[List[str]]
    size: Optional[ImageSize]
    score_quality: Optional[float]
    score_aesthetics: Optional[float]
    poses: Optional[List]

    # ---------- 回收站相关 ----------
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None

class ImagesOut(BaseModel):
    total: int
    images: List[ImageOut]

class ImageRequest(BaseModel):
    ids: List[UUID]
    page: int = 0
    pageSize: int = 20

class ImageDeleteRequest(BaseModel):
    deleted_by: str
    reason: Optional[str] = None


class RecycleBinLogOut(BaseModel):
    image_id: UUID
    action: str  # 'DELETE' 或 'RESTORE'
    action_by: Optional[str] = None
    reason: Optional[str] = None
