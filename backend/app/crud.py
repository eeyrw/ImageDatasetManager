from pathlib import Path
from typing import Dict, List
import uuid
from sqlalchemy import UUID, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from .schemas import ImageOut, ImageSize
from .models import Image, Dataset, ImageCaption, ImagePose, ImageTag
from .build_forest_from_paths import build_forest_from_abs_paths
from .config import settings
from sqlalchemy.orm import aliased
from sqlalchemy import func

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict
from uuid import UUID

# 定义一个对应物化视图的SQLAlchemy模型（简化版）
from sqlalchemy.orm import registry
from sqlalchemy import Column, String, Integer, ARRAY, Float
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, TEXT


from urllib.parse import quote

IMGPROXY_URL = "http://localhost:8082"
IMGPROXY_PATH_PREFIX = "insecure/width:300/plain/local://"
IMGPROXY_PATH_PREFIX_RAW_SIZE = "insecure/plain/local://"

ROOT_DIR = settings.root_dir
IMAGE_DIR = settings.image_dir


# mapper_registry = registry()

# @mapper_registry.mapped
# class MatViewImageInfo:
#     __tablename__ = "mat_view_image_info"

#     image_id = Column(PG_UUID, primary_key=True)
#     dataset_id = Column(PG_UUID)
#     file_id = Column(PG_UUID)
#     file_path = Column(TEXT)
#     dir_path = Column(TEXT)
#     caption = Column(TEXT)
#     tags = Column(ARRAY(TEXT))
#     width = Column(Integer)
#     height = Column(Integer)
#     quality_score = Column(Float)
#     aesthetic_score = Column(Float)


# async def query_images_by_dataset_ids(
#     db: AsyncSession,
#     dataset_ids: List[UUID],
#     page: int = 0,
#     pagesize: int = 20
# ) -> Dict:
#     if not dataset_ids:
#         return {"total": 0, "images": []}

#     # 查询物化视图数据
#     stmt = (
#         select(MatViewImageInfo)
#         .where(MatViewImageInfo.dataset_id.in_(dataset_ids))
#         .order_by(MatViewImageInfo.dir_path.asc(), MatViewImageInfo.file_path.asc(), MatViewImageInfo.image_id.asc())
#         .limit(pagesize)
#         .offset(page * pagesize)
#     )

#     result = await db.execute(stmt)
#     rows = result.scalars().all()

#     # 统计总数
#     count_stmt = (
#         select(func.count())
#         .select_from(MatViewImageInfo)
#         .where(MatViewImageInfo.dataset_id.in_(dataset_ids))
#     )
#     count_result = await db.execute(count_stmt)
#     total_count = count_result.scalar_one()

#     images_out = []
#     for row in rows:
#         # 这里url拼接逻辑也可以放到视图里预先算好，或用 dir_path + file_path 拼接
#         rel_path = Path(row.dir_path).relative_to(ROOT_DIR) / Path(row.file_path)
#         url = f"{IMGPROXY_URL}{IMGPROXY_PATH_PREFIX}/{quote(rel_path.as_posix(), safe=':/?=&')}@webp"
#         raw_size_image_url = f"{IMGPROXY_URL}{IMGPROXY_PATH_PREFIX_RAW_SIZE}/{quote(rel_path.as_posix(), safe=':/?=&')}@webp"
#         images_out.append({
#             "id": row.image_id,
#             "path": f"{row.dir_path.rstrip('/')}/{row.file_path.lstrip('/')}",
#             "url": url,
#             "raw_size_image_url": raw_size_image_url,
#             "title": row.caption,
#             "tags": row.tags,
#             "size": {"w": row.width, "h": row.height} if row.width and row.height else None,
#             "score_quality": row.quality_score,
#             "score_aesthetics": row.aesthetic_score,
#         })

#     return {"total": total_count, "images": images_out}

async def query_images_by_dataset_ids(
    db: AsyncSession,
    dataset_ids: List[str],
    page: int = 0,
    pagesize: int = 20
) -> Dict:
    if not dataset_ids:
        return {"total": 0, "images": []}

    # 查询 images + dataset
    stmt = (
        select(Image, Dataset)
        .join(Dataset, Image.dataset_id == Dataset.id)
        .where(Image.dataset_id.in_(dataset_ids))
        .order_by(Dataset.dir_path.asc(), Image.file_path.asc(), Image.id.asc())
        .limit(pagesize)
        .offset(page * pagesize)
    )
    result = await db.execute(stmt)
    rows = result.all()

    # 总数
    count_stmt = select(func.count()).select_from(
        Image).where(Image.dataset_id.in_(dataset_ids))
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar_one()

    image_ids = [img.id for img, _ in rows]

    # captions
    captions_map = {}
    if image_ids:
        captions_stmt = select(ImageCaption).where(
            ImageCaption.image_id.in_(image_ids))
        captions_result = await db.execute(captions_stmt)
        for c in captions_result.scalars().all():
            captions_map.setdefault(c.image_id, []).append(c)

    # tags
    tags_map = {}
    if image_ids:
        tags_stmt = select(ImageTag).where(ImageTag.image_id.in_(image_ids))
        tags_result = await db.execute(tags_stmt)
        for t in tags_result.scalars().all():
            tags_map[t.image_id] = t.tags

    # poses
    poses_map = {}
    if image_ids:
        poses_stmt = select(ImagePose).where(ImagePose.image_id.in_(image_ids))
        poses_result = await db.execute(poses_stmt)
        for p in poses_result.scalars().all():
            poses_map.setdefault(p.image_id, []).append({
                "pose_index": p.pose_index,
                "bbox": p.bbox,
                "invalid_kpts_idx": p.invalid_kpts_idx,
                "kpts_x": p.kpts_x,
                "kpts_y": p.kpts_y
            })

    images_out = []
    for image, dataset in rows:
        caps = captions_map.get(image.id, [])
        title = None
        for c in caps:
            if c.caption_type.lower() in ("hq", "high_quality", "hq_cap"):
                title = c.caption
                break
        if not title and caps:
            title = caps[0].caption

        # 将 dataset.dir_path 作为 root，生成相对路径
        mid_path = Path(image.file_path)
        rel_path = dataset.dir_path / mid_path
        url = f"{IMGPROXY_URL}/{IMGPROXY_PATH_PREFIX}/{quote(rel_path.as_posix(), safe=':/?=&')}@webp"
        raw_size_image_url = f"{IMGPROXY_URL}/{IMGPROXY_PATH_PREFIX_RAW_SIZE}/{quote(rel_path.as_posix(), safe=':/?=&')}@webp"

        images_out.append({
            "id": image.id,
            "path": str(rel_path),
            "url": url,
            "raw_size_image_url": raw_size_image_url,
            "title": title,
            "tags": tags_map.get(image.id),
            "size": {"w": image.width, "h": image.height},
            "score_quality": image.quality_score,
            "score_aesthetics": image.aesthetic_score,
            "poses": poses_map.get(image.id, [])
        })

    return {"total": total_count, "images": images_out}


async def query_dataset_ids_and_build_tree(db: AsyncSession):
    async with db:
        # 查 datasets.id 和 dir_path
        stmt = select(Dataset.id, Dataset.dir_path)
        result = await db.execute(stmt)
        dataset_records = result.all()  # List[Tuple[UUID, str]]

    # dataset_records 元素格式示例: (dataset_id, dir_path)
    tree = build_forest_from_abs_paths(dataset_records)
    return tree
