import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, selectinload
from meilisearch import Client
from models import Image, ImageCaption, ImageTag, Dataset
from config import settings  # 保留以防后续用到
from sqlalchemy import select
import os

# Meilisearch 配置
MEILI_URL = os.environ.get("MEILI_URL", "http://localhost:7700")
MEILI_INDEX = "images"

DATABASE_URL = "postgresql+asyncpg://postgres:example@localhost:5432/image_dataset_db4"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(
    engine, expire_on_commit=False, class_=AsyncSession)

client = Client(MEILI_URL)
index = client.index(MEILI_INDEX)


async def fetch_images(session):
    stmt = (
        select(Image)
        .options(
            selectinload(Image.captions),
            selectinload(Image.tags),
            selectinload(Image.dataset),
            selectinload(Image.poses)
        )
    )
    result = await session.execute(stmt)
    return result.scalars().all()


async def sync_to_meilisearch():
    from urllib.parse import quote
    IMGPROXY_URL = "http://localhost:8082"
    IMGPROXY_PATH_PREFIX = "insecure/width:300/plain/local://"
    IMGPROXY_PATH_PREFIX_RAW_SIZE = "insecure/plain/local://"

    async with async_session() as session:
        images = await fetch_images(session)
        docs = []
        for img in images:
            dataset_dir = img.dataset.dir_path if img.dataset else ""
            # 拼接图片相对路径
            from pathlib import Path
            mid_path = Path(img.file_path)
            rel_path = Path(dataset_dir) / \
                mid_path if dataset_dir else mid_path
            url = f"{IMGPROXY_URL}/{IMGPROXY_PATH_PREFIX}/{quote(rel_path.as_posix(), safe=':/?=&')}@webp"
            raw_size_image_url = f"{IMGPROXY_URL}/{IMGPROXY_PATH_PREFIX_RAW_SIZE}/{quote(rel_path.as_posix(), safe=':/?=&')}@webp"
            poses = []
            if hasattr(img, "poses") and img.poses:
                for p in img.poses:
                    poses.append({
                        "pose_index": p.pose_index,
                        "bbox": p.bbox,
                        "invalid_kpts_idx": p.invalid_kpts_idx,
                        "kpts_x": p.kpts_x,
                        "kpts_y": p.kpts_y
                    })

            captionDict = {}
            
            for c in (img.captions or []):
                captionDict.setdefault(c.caption_type, []).append(c.caption)

            docs.append({
                "id": str(img.id),
                # "dataset_id": str(img.dataset_id),
                # "file_path": img.file_path,
                # "dataset_dir": dataset_dir,
                # "captions": captionDict,
                # "tags": img.tags.tags if img.tags else [],
                # "width": img.width,
                # "height": img.height,
                # "quality_score": img.quality_score,
                # "aesthetic_score": img.aesthetic_score,
                # "aesthetic_eat": img.aesthetic_eat,
                # "watermark_prob": img.watermark_prob,
                # "url": url,
                # "raw_size_image_url": raw_size_image_url,
                # "poses": poses,
                "_vectors": {"dinov3": img.image_embedding},
            })
        print(f"Syncing {len(docs)} images to Meilisearch...")
        index.update_documents_in_batches(docs)
        print("Done.")

if __name__ == "__main__":
    asyncio.run(sync_to_meilisearch())
