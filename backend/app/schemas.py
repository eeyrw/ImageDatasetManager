from __future__ import annotations
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID


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

class ImageRequest(BaseModel):
    ids: List[UUID]
    page: int = 0
    pageSize: int = 20