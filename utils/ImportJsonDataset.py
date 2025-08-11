import os
import json
import psycopg2
from psycopg2.extras import execute_values
from tqdm import tqdm

DB_CONFIG = {
    'dbname': 'image_dataset_db3',
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
    # 查询 dataset_dirs 是否存在该目录
    cur.execute("SELECT id, dataset_id FROM dataset_dirs WHERE dir_path = %s", (dataset_dir_path,))
    row = cur.fetchone()
    if row:
        return row  # (dataset_dir_id, dataset_id)

    # 目录不存在则先获取或创建 datasets 记录
    dataset_name = os.path.basename(dataset_dir_path)
    cur.execute("SELECT id FROM datasets WHERE name = %s", (dataset_name,))
    ds = cur.fetchone()
    if ds:
        dataset_id = ds[0]
    else:
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

def batch_import(root_dir):
    conn = connect_db()
    try:
        with conn:
            with conn.cursor() as cur:
                imageinfo_files = find_imageinfo_files(root_dir)
                print(f"Found {len(imageinfo_files)} ImageInfo.json files under {root_dir}")

                for info_path in imageinfo_files:
                    with open(info_path, 'r', encoding='utf-8') as f:
                        json_records = json.load(f)
                    print(f'Importing {info_path}')

                    if not isinstance(json_records, list):
                        json_records = [json_records]

                    # 先批量准备 files 和 images 插入数据
                    file_records = []
                    images_records = []
                    captions_records = []
                    tags_records = []
                    pose_records = []
                    features_records = []

                    dataset_dir_path = os.path.dirname(info_path)
                    dataset_dir_id, dataset_id = get_or_create_dataset_and_dir(cur, dataset_dir_path)

                    for data in tqdm(json_records, desc=f"Records in {os.path.basename(info_path)}", leave=False):
                        file_path = data["IMG"]
                        file_format = file_path.split('.')[-1].lower() if '.' in file_path else None

                        # files 记录准备，file_hash,file_size,last_modified 可选字段这里留空示例
                        file_records.append((
                            dataset_dir_id,
                            file_path,
                            None,      # file_hash
                            None,      # file_size
                            file_format,
                            None,      # last_modified
                            None       # created_at - 让数据库默认 now() 自动填充
                        ))


                    # 批量 upsert files（用 ON CONFLICT DO UPDATE）
                    # 先插入 files 返回 id 需要临时处理，用 file_path 做匹配
                    insert_files_sql = """
                    INSERT INTO files (dataset_dir_id, file_path, file_hash, file_size, file_format, last_modified, created_at)
                    VALUES %s
                    ON CONFLICT (dataset_dir_id, file_path) DO UPDATE SET
                        file_format = EXCLUDED.file_format,
                        last_modified = EXCLUDED.last_modified
                    RETURNING id, dataset_dir_id, file_path
                    """
                    files_db = execute_values(cur, insert_files_sql, file_records, fetch=True)


                    # 建立 file_path -> file_id 映射，方便后续关联
                    file_path_to_id = {row[2]: row[0] for row in files_db}

                    # 准备 images、captions、tags、pose、features 批量插入数据
                    for data in json_records:
                        file_path = data["IMG"]
                        file_id = file_path_to_id.get(file_path)
                        if not file_id:
                            # 理论不该出现，容错
                            continue

                        # images 记录
                        images_records.append((file_id, dataset_id))

                        # captions
                        caps = data.get("CAP", [])
                        for c in caps:
                            captions_records.append((file_id, c, 'generic'))

                        hq_caps = data.get("HQ_CAP", [])
                        for c in hq_caps:
                            captions_records.append((file_id, c, 'hq'))

                        # tags
                        tag_str = data.get("DBRU_TAG", "")
                        tags = [t.strip() for t in tag_str.split(",")] if tag_str else []
                        if tags:
                            tags_records.append((file_id, tags))

                        # pose
                        poses = data.get("POSE_KPTS", [])
                        for idx, pose in enumerate(poses):
                            bbox = pose.get("BBOX")
                            invalid_kpts_idx = pose.get("INVLD_KPTS_IDX", [])
                            kpts_x = pose.get("KPTS_X", [])
                            kpts_y = pose.get("KPTS_Y", [])
                            pose_records.append((
                                file_id,
                                idx,
                                bbox,
                                invalid_kpts_idx,
                                kpts_x,
                                kpts_y
                            ))

                        # features
                        features_records.append((
                            file_id,
                            data.get("W"),
                            data.get("H"),
                            data.get("A_CENTER"),
                            data.get("A_EAT"),
                            data.get("HAS_WATERMARK"),
                            data.get("Q512"),
                            data.get("A")
                        ))

                    # 批量插入 images（避免重复）
                    insert_images_sql = """
                    INSERT INTO images (file_id, dataset_id)
                    VALUES %s
                    ON CONFLICT (dataset_id, file_id) DO NOTHING
                    """
                    execute_values(cur, insert_images_sql, images_records)

                    # 批量插入 captions，ON CONFLICT DO NOTHING
                    insert_captions_sql = """
                    INSERT INTO image_captions (file_id, caption, caption_type)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """
                    execute_values(cur, insert_captions_sql, captions_records)

                    # 批量插入 tags，使用 ON CONFLICT DO UPDATE
                    insert_tags_sql = """
                    INSERT INTO image_tags (file_id, tags)
                    VALUES %s
                    ON CONFLICT (file_id) DO UPDATE SET tags = EXCLUDED.tags
                    """
                    execute_values(cur, insert_tags_sql, tags_records)

                    # 批量插入 pose，ON CONFLICT DO NOTHING
                    insert_pose_sql = """
                    INSERT INTO image_pose (file_id, pose_index, bbox, invalid_kpts_idx, kpts_x, kpts_y)
                    VALUES %s
                    ON CONFLICT (file_id, pose_index) DO NOTHING
                    """
                    execute_values(cur, insert_pose_sql, pose_records)

                    # 批量插入 features，ON CONFLICT DO UPDATE
                    insert_features_sql = """
                    INSERT INTO image_features
                    (file_id, width, height, semantic_center, aesthetic_eat, watermark_prob, quality_score, aesthetic_score)
                    VALUES %s
                    ON CONFLICT (file_id) DO UPDATE SET
                      width = EXCLUDED.width,
                      height = EXCLUDED.height,
                      semantic_center = EXCLUDED.semantic_center,
                      aesthetic_eat = EXCLUDED.aesthetic_eat,
                      watermark_prob = EXCLUDED.watermark_prob,
                      quality_score = EXCLUDED.quality_score,
                      aesthetic_score = EXCLUDED.aesthetic_score
                    """
                    execute_values(cur, insert_features_sql, features_records)

    finally:
        conn.close()

if __name__ == "__main__":
    root_dataset_dir = "/mnt/yuansnas/Backup/big_server/ds/DiffusionDataset"
    batch_import(root_dataset_dir)
