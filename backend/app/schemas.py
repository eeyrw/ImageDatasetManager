import uuid
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

class ImageCaptionOut(BaseModel):
    caption: str
    caption_type: str

    class Config:
        orm_mode = True

class ImageFeatureOut(BaseModel):
    width: Optional[int]
    height: Optional[int]

    class Config:
        orm_mode = True

class ImageOut(BaseModel):
    id: str
    file_path: str
    captions: List[ImageCaptionOut]
    feature: Optional[ImageFeatureOut]

    class Config:
        orm_mode = True

# ---------- Pydantic ----------
class DatasetDirOut(BaseModel):
    id: uuid.UUID
    path: str
    class Config:
        orm_mode = True

class DatasetTreeOut(BaseModel):
    id: uuid.UUID
    name: str
    dirs: List[DatasetDirOut]
    class Config:
        orm_mode = True



class ImageSize(BaseModel):
    w: Optional[int]
    h: Optional[int]

class ImageOut(BaseModel):
    id: UUID
    path: str
    url: Optional[str]
    title: Optional[str]
    tags: Optional[List[str]]
    size: Optional[ImageSize]
    score_quality: Optional[float]
    score_aesthetics: Optional[float]

class ImageRequest(BaseModel):
    ids: List[UUID]
    page: int = 0
    pageSize: int = 20