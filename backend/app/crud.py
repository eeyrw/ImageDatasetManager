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

IMGPROXY_URL = "http://localhost:8082"
IMGPROXY_PATH_PREFIX = "/insecure/width:300/plain/local://"

ROOT_DIR = settings.root_dir
IMAGE_DIR = settings.image_dir

async def query_images_by_dataset_ids(
    db: AsyncSession,
    dataset_ids: List[UUID],
    page: int = 0,
    pagesize: int = 20
) -> Dict:
    if not dataset_ids:
        return {"total": 0, "images": []}

    DatasetDirAlias = aliased(DatasetDir)

    stmt = (
        select(Image, File, DatasetDirAlias, ImageFeature)
        .join(File, Image.file_id == File.id)
        .join(DatasetDirAlias, File.dataset_dir_id == DatasetDirAlias.id)
        .outerjoin(ImageFeature, ImageFeature.file_id == File.id)
        .where(Image.dataset_id.in_(dataset_ids))
        .order_by(
            DatasetDirAlias.dir_path.asc()
        )
        .limit(pagesize)
        .offset(page * pagesize)
    )
    result = await db.execute(stmt)
    rows = result.all()

    count_stmt = select(func.count()).select_from(Image).where(Image.dataset_id.in_(dataset_ids))
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar_one()

    file_ids = [file.id for _, file, _, _ in rows]

    captions_map = {}
    tags_map = {}

    if file_ids:
        captions_stmt = select(ImageCaption).where(ImageCaption.file_id.in_(file_ids))
        tags_stmt = select(ImageTag).where(ImageTag.file_id.in_(file_ids))
        captions_result = await db.execute(captions_stmt)
        tags_result = await db.execute(tags_stmt)
        captions = captions_result.scalars().all()
        tags = tags_result.scalars().all()

        for c in captions:
            captions_map.setdefault(c.file_id, []).append(c)

        tags_map = {t.file_id: t.tags for t in tags}

    images_out = []

    for image, file, dataset_dir, feature in rows:
        caps = captions_map.get(file.id, [])
        title = None
        for c in caps:
            if c.caption_type.lower() in ("hq", "high_quality", "hq_cap"):
                title = c.caption
                break
        if not title and caps:
            title = caps[0].caption

        mid_path = Path(dataset_dir.dir_path).relative_to(ROOT_DIR)
        rel_path = mid_path / Path(file.file_path)
        url = f"{IMGPROXY_URL}{IMGPROXY_PATH_PREFIX}/{rel_path.as_posix().replace('#', '%23')}@webp"

        images_out.append({
            "id": image.id,
            "path": str(Path(dataset_dir.dir_path)/Path(file.file_path)),
            "url": url,
            "title": title,
            "tags": tags_map.get(file.id),
            "size": {"w": feature.width if feature else None,
                     "h": feature.height if feature else None} if feature else None,
            "score_quality": feature.quality_score if feature else None,
            "score_aesthetics": feature.aesthetic_score if feature else None,
        })

    return {"total": total_count, "images": images_out}



async def query_dataset_ids_and_build_tree(db: AsyncSession):
    async with db:
        # 查 dataset_dirs.dataset_id 和 dir_path
        stmt = select(DatasetDir.dataset_id, DatasetDir.dir_path)
        result = await db.execute(stmt)
        dir_records = result.all()  # List[Tuple[UUID, str]]

    # dir_records 元素格式示例: (dataset_id, dir_path)
    tree = build_forest_with_root_filter(dir_records, [IMAGE_DIR])
    return tree