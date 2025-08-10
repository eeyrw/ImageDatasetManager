import os
import json
import psycopg2
from psycopg2.extras import execute_values
from tqdm import tqdm

# 数据库连接参数
DB_CONFIG = {
    'dbname': 'image_dataset_db2',
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

def get_or_create_dataset_and_dir(cur, dataset_dir_path):
    # 先看 dataset_dirs 表是否已有该路径
    cur.execute("SELECT id, dataset_id FROM dataset_dirs WHERE dir_path = %s", (dataset_dir_path,))
    row = cur.fetchone()
    if row:
        return row  # (dataset_dir_id, dataset_id)

    # 目录不存在，插入新数据集和数据集目录
    # 这里你可以定义规则决定数据集名称，比如取目录名
    dataset_name = os.path.basename(dataset_dir_path)
    # 先看 datasets 表有没有这个名字的数据集
    cur.execute("SELECT id FROM datasets WHERE name = %s", (dataset_name,))
    ds = cur.fetchone()
    if ds:
        dataset_id = ds[0]
    else:
        # 插入新的数据集，其他字段留空或你可以补充
        cur.execute("""
            INSERT INTO datasets (name, created_at) VALUES (%s, now())
            RETURNING id
        """, (dataset_name,))
        dataset_id = cur.fetchone()[0]

    # 插入 dataset_dirs
    cur.execute("""
        INSERT INTO dataset_dirs (dataset_id, dir_path, created_at)
        VALUES (%s, %s, now())
        RETURNING id
    """, (dataset_id, dataset_dir_path))
    dataset_dir_id = cur.fetchone()[0]

    return dataset_dir_id, dataset_id

def import_image_record(cur, data, image_info_abs_path):
    dataset_dir_path = os.path.dirname(image_info_abs_path)
    dataset_dir_id, dataset_id = get_or_create_dataset_and_dir(cur, dataset_dir_path)

    file_path = data["IMG"]
    file_format = file_path.split('.')[-1].lower() if '.' in file_path else None

    cur.execute("""
        INSERT INTO files (dataset_dir_id, file_path, file_format, created_at)
        VALUES (%s, %s, %s, now())
        ON CONFLICT (dataset_dir_id, file_path) DO UPDATE SET file_format = EXCLUDED.file_format
        RETURNING id
    """, (dataset_dir_id, file_path, file_format))
    file_id = cur.fetchone()[0]

    cur.execute("""
        INSERT INTO images (file_id, dataset_id) VALUES (%s, %s)
        RETURNING id
    """, (file_id, dataset_id))
    image_id = cur.fetchone()[0]

    width = data.get("W")
    height = data.get("H")
    quality_score = data.get("Q512")
    aesthetic_score = data.get("A")
    semantic_center = data.get("A_CENTER")
    aesthetic_eat = data.get("A_EAT")
    watermark_prob = data.get("HAS_WATERMARK")

    cur.execute("""
        INSERT INTO image_features (image_id, width, height, quality_score, aesthetic_score, semantic_center, aesthetic_eat, watermark_prob)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (image_id, width, height, quality_score, aesthetic_score, semantic_center, aesthetic_eat, watermark_prob))

    captions = data.get("CAP", [])
    hq_captions = data.get("HQ_CAP", [])
    for cap in captions:
        cur.execute("""
            INSERT INTO image_captions (image_id, caption, caption_type) VALUES (%s, %s, 'generic')
            ON CONFLICT DO NOTHING
        """, (image_id, cap))
    for cap in hq_captions:
        cur.execute("""
            INSERT INTO image_captions (image_id, caption, caption_type) VALUES (%s, %s, 'hq')
            ON CONFLICT DO NOTHING
        """, (image_id, cap))

    tag_str = data.get("DBRU_TAG", "")
    tags = [t.strip() for t in tag_str.split(",")] if tag_str else []
    if tags:
        cur.execute("""
            INSERT INTO image_tags (image_id, tags) VALUES (%s, %s)
            ON CONFLICT (image_id) DO UPDATE SET tags = EXCLUDED.tags
        """, (image_id, tags))

    poses = data.get("POSE_KPTS", [])
    for idx, pose in enumerate(poses):
        bbox = pose.get("BBOX")
        invalid_kpts_idx = pose.get("INVLD_KPTS_IDX", [])
        kpts_x = pose.get("KPTS_X", [])
        kpts_y = pose.get("KPTS_Y", [])
        cur.execute("""
            INSERT INTO image_pose (image_id, pose_index, bbox, invalid_kpts_idx, kpts_x, kpts_y)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (image_id, pose_index) DO NOTHING
        """, (image_id, idx, bbox, invalid_kpts_idx, kpts_x, kpts_y))

def batch_import(root_dir):
    conn = connect_db()
    try:
        with conn:
            with conn.cursor() as cur:
                imageinfo_files = find_imageinfo_files(root_dir)
                print(imageinfo_files)
                print(f"Found {len(imageinfo_files)} ImageInfo.json files under {root_dir}")
                for info_path in imageinfo_files:
                    with open(info_path, 'r', encoding='utf-8') as f:
                        json_records = json.load(f)
                        print(f'Importing {info_path}')
                        if isinstance(json_records, list):
                            for record in tqdm(json_records, desc=f"Records in {os.path.basename(info_path)}", leave=False):
                                try:
                                    import_image_record(cur, record, info_path)
                                except Exception as e:
                                    print(f"Error importing record from {info_path}: {e}")
                        else:
                            try:
                                import_image_record(cur, json_records, info_path)
                            except Exception as e:
                                print(f"Error importing record from {info_path}: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    # 这里替换成你数据集根目录
    root_dataset_dir = "/mnt/yuansnas/Backup/big_server/ds/DiffusionDataset"
    batch_import(root_dataset_dir)
