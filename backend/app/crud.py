from pathlib import Path
from typing import Dict, List
import uuid
from sqlalchemy import UUID, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from .schemas import ImageOut, ImageSize
from .models import File, Image,Dataset,DatasetDir, ImageCaption, ImageFeature, ImageTag
from .build_forest_from_paths import build_forest_with_root_filter
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
IMGPROXY_PATH_PREFIX = "/insecure/width:300/plain/local://"
IMGPROXY_PATH_PREFIX_RAW_SIZE = "/insecure/plain/local://"

ROOT_DIR = settings.root_dir
IMAGE_DIR = settings.image_dir


mapper_registry = registry()

@mapper_registry.mapped
class MatViewImageInfo:
    __tablename__ = "mat_view_image_info"

    image_id = Column(PG_UUID, primary_key=True)
    dataset_id = Column(PG_UUID)
    file_id = Column(PG_UUID)
    file_path = Column(TEXT)
    dir_path = Column(TEXT)
    caption = Column(TEXT)
    tags = Column(ARRAY(TEXT))
    width = Column(Integer)
    height = Column(Integer)
    quality_score = Column(Float)
    aesthetic_score = Column(Float)


async def query_images_by_dataset_ids(
    db: AsyncSession,
    dataset_ids: List[UUID],
    page: int = 0,
    pagesize: int = 20
) -> Dict:
    if not dataset_ids:
        return {"total": 0, "images": []}

    # 查询物化视图数据
    stmt = (
        select(MatViewImageInfo)
        .where(MatViewImageInfo.dataset_id.in_(dataset_ids))
        .order_by(MatViewImageInfo.dir_path.asc(), MatViewImageInfo.file_path.asc(), MatViewImageInfo.image_id.asc())
        .limit(pagesize)
        .offset(page * pagesize)
    )

    result = await db.execute(stmt)
    rows = result.scalars().all()

    # 统计总数
    count_stmt = (
        select(func.count())
        .select_from(MatViewImageInfo)
        .where(MatViewImageInfo.dataset_id.in_(dataset_ids))
    )
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar_one()

    images_out = []
    for row in rows:
        # 这里url拼接逻辑也可以放到视图里预先算好，或用 dir_path + file_path 拼接
        rel_path = Path(row.dir_path).relative_to(ROOT_DIR) / Path(row.file_path)
        url = f"{IMGPROXY_URL}{IMGPROXY_PATH_PREFIX}/{quote(rel_path.as_posix(), safe=":/?=&")}@webp"
        raw_size_image_url = f"{IMGPROXY_URL}{IMGPROXY_PATH_PREFIX_RAW_SIZE}/{quote(rel_path.as_posix(), safe=":/?=&")}@webp"
        images_out.append({
            "id": row.image_id,
            "path": f"{row.dir_path.rstrip('/')}/{row.file_path.lstrip('/')}",
            "url": url,
            "raw_size_image_url": raw_size_image_url,
            "title": row.caption,
            "tags": row.tags,
            "size": {"w": row.width, "h": row.height} if row.width and row.height else None,
            "score_quality": row.quality_score,
            "score_aesthetics": row.aesthetic_score,
        })

    return {"total": total_count, "images": images_out}
# async def query_images_by_dataset_ids(
#     db: AsyncSession,
#     dataset_ids: List[UUID],
#     page: int = 0,
#     pagesize: int = 20
# ) -> Dict:
#     if not dataset_ids:
#         return {"total": 0, "images": []}

#     DatasetDirAlias = aliased(DatasetDir)

#     stmt = (
#         select(Image, File, DatasetDirAlias, ImageFeature)
#         .join(File, Image.file_id == File.id)
#         .join(DatasetDirAlias, File.dataset_dir_id == DatasetDirAlias.id)
#         .outerjoin(ImageFeature, ImageFeature.file_id == File.id)
#         .where(Image.dataset_id.in_(dataset_ids))
#         .order_by(
#             DatasetDirAlias.dir_path.asc(),
#             File.file_path.asc(),
#             Image.id.asc()
#         )
#         .limit(pagesize)
#         .offset(page * pagesize)
#     )
#     result = await db.execute(stmt)
#     rows = result.all()

#     count_stmt = select(func.count()).select_from(Image).where(Image.dataset_id.in_(dataset_ids))
#     count_result = await db.execute(count_stmt)
#     total_count = count_result.scalar_one()

#     file_ids = [file.id for _, file, _, _ in rows]

#     captions_map = {}
#     tags_map = {}

#     if file_ids:
#         captions_stmt = select(ImageCaption).where(ImageCaption.file_id.in_(file_ids))
#         tags_stmt = select(ImageTag).where(ImageTag.file_id.in_(file_ids))
#         captions_result = await db.execute(captions_stmt)
#         tags_result = await db.execute(tags_stmt)
#         captions = captions_result.scalars().all()
#         tags = tags_result.scalars().all()

#         for c in captions:
#             captions_map.setdefault(c.file_id, []).append(c)

#         tags_map = {t.file_id: t.tags for t in tags}

#     images_out = []

#     for image, file, dataset_dir, feature in rows:
#         caps = captions_map.get(file.id, [])
#         title = None
#         for c in caps:
#             if c.caption_type.lower() in ("hq", "high_quality", "hq_cap"):
#                 title = c.caption
#                 break
#         if not title and caps:
#             title = caps[0].caption

#         mid_path = Path(dataset_dir.dir_path).relative_to(ROOT_DIR)
#         rel_path = mid_path / Path(file.file_path)
#         url = f"{IMGPROXY_URL}{IMGPROXY_PATH_PREFIX}/{rel_path.as_posix().replace('#', '%23')}@webp"

#         images_out.append({
#             "id": image.id,
#             "path": str(Path(dataset_dir.dir_path)/Path(file.file_path)),
#             "url": url,
#             "title": title,
#             "tags": tags_map.get(file.id),
#             "size": {"w": feature.width if feature else None,
#                      "h": feature.height if feature else None} if feature else None,
#             "score_quality": feature.quality_score if feature else None,
#             "score_aesthetics": feature.aesthetic_score if feature else None,
#         })

#     return {"total": total_count, "images": images_out}



async def query_dataset_ids_and_build_tree(db: AsyncSession):
    async with db:
        # 查 dataset_dirs.dataset_id 和 dir_path
        stmt = select(DatasetDir.dataset_id, DatasetDir.dir_path)
        result = await db.execute(stmt)
        dir_records = result.all()  # List[Tuple[UUID, str]]

    # dir_records 元素格式示例: (dataset_id, dir_path)
    tree = build_forest_with_root_filter(dir_records, [IMAGE_DIR])
    return tree