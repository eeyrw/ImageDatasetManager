from pydantic import BaseModel
from typing import Optional

class DatasetSample(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    size: float
    is_active: bool
    # 可根据实际需求添加更多字段
