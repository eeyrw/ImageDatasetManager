import os
import json
import psycopg2
from psycopg2.extras import execute_values
from tqdm import tqdm

DB_CONFIG = {
    'dbname': 'image_dataset_db4',
    'user': 'postgres',
    'password': 'example',
    'host': 'localhost',
    'port': 5432
}


def connect_db():
    return psycopg2.connect(**DB_CONFIG)


def find_imageinfo_files(root_dir):
    imageinfo_files = []
    for dirpath, _, files in os.walk(root_dir):
        for f in files:
            if f.lower() == "imageinfo.json":
                imageinfo_files.append(os.path.join(dirpath, f))
    return imageinfo_files


def get_or_create_dataset(cur, dataset_root_dir, json_dir):
    """
    dataset_root_dir: 顶层目录，例如 /mnt/.../DiffusionDataset
    json_dir: imageinfo.json 所在目录
    """
    # dataset_name 取 imageinfo.json 所在目录名（最后一级目录）
    dataset_name = os.path.basename(json_dir.rstrip("/"))

    # dir_path 保留从顶层到 JSON 所在目录的相对路径
    rel_dir_path = os.path.relpath(json_dir, os.path.dirname(dataset_root_dir))

    cur.execute("SELECT id FROM datasets WHERE dir_path = %s", (rel_dir_path,))
    row = cur.fetchone()
    if row:
        return row[0]

    # 不存在则创建
    cur.execute("""
        INSERT INTO datasets (name, dir_path, created_at)
        VALUES (%s, %s, now())
        RETURNING id
    """, (dataset_name, rel_dir_path))
    return cur.fetchone()[0]


def batch_import(root_dir):
    conn = connect_db()
    try:
        with conn:
            with conn.cursor() as cur:
                imageinfo_files = find_imageinfo_files(root_dir)
                print(
                    f"Found {len(imageinfo_files)} ImageInfo.json files under {root_dir}")

                for info_path in imageinfo_files:
                    with open(info_path, 'r', encoding='utf-8') as f:
                        json_records = json.load(f)
                    print(f'Importing {info_path}')

                    if not isinstance(json_records, list):
                        json_records = [json_records]

                    images_records = []
                    captions_records = []
                    tags_records = []
                    pose_records = []

                    # 获取 dataset_id，保证 dataset.name 是顶层，dir_path 保留相对路径
                    dataset_id = get_or_create_dataset(
                        cur, root_dir, os.path.dirname(info_path))

                    for data in tqdm(json_records, desc=f"Records in {os.path.basename(info_path)}", leave=False):
                        file_path = data["IMG"]
                        file_format = file_path.split(
                            '.')[-1].lower() if '.' in file_path else None

                        # images 记录
                        images_records.append((
                            dataset_id,
                            file_path,
                            None,  # file_hash
                            None,  # file_size
                            file_format,
                            None,  # last_modified
                            data.get("W"),
                            data.get("H"),
                            data.get("A_CENTER"),
                            data.get("A_EAT"),
                            data.get("HAS_WATERMARK"),
                            data.get("Q512"),
                            data.get("A")
                        ))

                    # 批量插入 images 并返回 id
                    insert_images_sql = """
                    INSERT INTO images
                    (dataset_id, file_path, file_hash, file_size, file_format, last_modified,
                     width, height, semantic_center, aesthetic_eat, watermark_prob,
                     quality_score, aesthetic_score)
                    VALUES %s
                    ON CONFLICT (dataset_id, file_path) DO UPDATE SET
                      file_format = EXCLUDED.file_format,
                      width = EXCLUDED.width,
                      height = EXCLUDED.height,
                      semantic_center = EXCLUDED.semantic_center,
                      aesthetic_eat = EXCLUDED.aesthetic_eat,
                      watermark_prob = EXCLUDED.watermark_prob,
                      quality_score = EXCLUDED.quality_score,
                      aesthetic_score = EXCLUDED.aesthetic_score
                    RETURNING id, file_path
                    """
                    inserted_images = execute_values(
                        cur, insert_images_sql, images_records, fetch=True)

                    # 建立 file_path -> image_id 映射
                    file_path_to_id = {row[1]: row[0]
                                       for row in inserted_images}

                    # captions / tags / pose
                    for data in json_records:
                        file_path = data["IMG"]
                        image_id = file_path_to_id.get(file_path)
                        if not image_id:
                            continue

                        # captions
                        for c in data.get("CAP", []):
                            captions_records.append((image_id, c, 'generic'))
                        for c in data.get("HQ_CAP", []):
                            captions_records.append((image_id, c, 'hq'))

                        # tags
                        tag_str = data.get("DBRU_TAG", "")
                        tags = [t.strip()
                                for t in tag_str.split(",")] if tag_str else []
                        if tags:
                            tags_records.append((image_id, tags))

                        # poses
                        poses = data.get("POSE_KPTS", [])
                        for idx, pose in enumerate(poses):
                            bbox = pose.get("BBOX")
                            invalid_kpts_idx = pose.get("INVLD_KPTS_IDX", [])
                            kpts_x = pose.get("KPTS_X", [])
                            kpts_y = pose.get("KPTS_Y", [])
                            pose_records.append((
                                image_id,
                                idx,
                                bbox,
                                invalid_kpts_idx,
                                kpts_x,
                                kpts_y
                            ))

                    if captions_records:
                        insert_captions_sql = """
                        INSERT INTO image_captions (image_id, caption, caption_type)
                        VALUES %s
                        ON CONFLICT DO NOTHING
                        """
                        execute_values(cur, insert_captions_sql,
                                       captions_records)

                    if tags_records:
                        insert_tags_sql = """
                        INSERT INTO image_tags (image_id, tags)
                        VALUES %s
                        ON CONFLICT (image_id) DO UPDATE SET tags = EXCLUDED.tags
                        """
                        execute_values(cur, insert_tags_sql, tags_records)

                    if pose_records:
                        insert_pose_sql = """
                        INSERT INTO image_pose (image_id, pose_index, bbox, invalid_kpts_idx, kpts_x, kpts_y)
                        VALUES %s
                        ON CONFLICT (image_id, pose_index) DO NOTHING
                        """
                        execute_values(cur, insert_pose_sql, pose_records)

    finally:
        conn.close()


if __name__ == "__main__":
    root_dataset_dir = "/mnt/yuansnas/Backup/big_server/ds/DiffusionDataset"
    batch_import(root_dataset_dir)
