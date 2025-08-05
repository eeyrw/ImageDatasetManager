from typing import List, Optional, Tuple
from app.models.dataset import DatasetSample

# 假设有数据库连接和ORM，这里用伪代码表示
# 实际项目可用 SQLAlchemy 或 async ORM

def query_samples(
    string_filters: Optional[dict] = None,
    range_filters: Optional[dict] = None,
    bool_filters: Optional[dict] = None,
    page: int = 1,
    size: int = 20
) -> Tuple[int, List[DatasetSample]]:
    """
    通用查询，支持字符串、数值范围、布尔条件，分页返回。
    参数:
        string_filters: {字段名: 匹配字符串}
        range_filters: {字段名: (min, max)}
        bool_filters: {字段名: bool值}
    """
    # 示例数据
    all_data = [
        DatasetSample(id=1, name="cat", description="A cat image", size=12.5, is_active=True),
        DatasetSample(id=2, name="dog", description="A dog image", size=15.0, is_active=False),
        # ...更多样本...
    ]
    filtered = []
    for sample in all_data:
        matched = True
        if string_filters:
            for field, value in string_filters.items():
                if value and value.lower() not in str(getattr(sample, field, "")).lower():
                    matched = False
                    break
        if matched and range_filters:
            for field, rng in range_filters.items():
                min_v, max_v = rng
                val = getattr(sample, field, None)
                if min_v is not None and val is not None and val < min_v:
                    matched = False
                    break
                if max_v is not None and val is not None and val > max_v:
                    matched = False
                    break
        if matched and bool_filters:
            for field, bval in bool_filters.items():
                if bval is not None and getattr(sample, field, None) != bval:
                    matched = False
                    break
        if matched:
            filtered.append(sample)
    total = len(filtered)
    start = (page - 1) * size
    end = start + size
    return total, filtered[start:end]

def list_queryable_fields() -> dict:
    """
    列举所有可查询字段及其类型。
    返回: {字段名: 查询类型}
    """
    # 可根据 DatasetSample 字段定义自动生成
    return {
        "name": "string",
        "description": "string",
        "size": "range",
        "is_active": "bool",
        "id": "range"
    }
