import uuid
import psycopg2
import json
from psycopg2.extras import execute_values

# PostgreSQL 连接配置
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "example",
    "dbname": "image_dataset_db",

}

# 示例数据集信息
DATASET_META = {
    "name": "example_dataset_v1",
    "description": "An example dataset with captions, poses, and features.",
    "license": "CC-BY-NC",
    "origin_url": "https://example.com/dataset"
}

# 示例图像 JSON（简化版）
json_str = """{
  "IMG": "57555581 Editorial illustrations/behance_57555581_07.heic",
  "W": 1141,
  "H": 1435,
  "Q512": 65.562,
  "A": 5.885,
  "CAP": ["a person climbing up another", "graphic art with soccer ball"],
  "HQ_CAP": ["A stylized art piece with pink and purple background."],
  "A_EAT": 4.977,
  "A_CENTER": [0.5, 0.3976],
  "DBRU_TAG": "shirt, 2boys, red background",
  "POSE_KPTS": [{
    "BBOX": [0.2, 0.2, 0.3, 0.4],
    "INVLD_KPTS_IDX": [],
    "KPTS_X": [0.28, 0.29],
    "KPTS_Y": [0.25, 0.26]
  }],
  "HAS_WATERMARK": 0.262
}"""

def insert_dataset(conn, meta):
    with conn.cursor() as cur:
        # 查询是否已存在
        cur.execute("SELECT id FROM datasets WHERE name = %s", (meta["name"],))
        row = cur.fetchone()
        if row:
            print(f"数据集已存在：{meta['name']}")
            return row[0]

        # 不存在就插入
        cur.execute("""
            INSERT INTO datasets (name, description, license, origin_url)
            VALUES (%s, %s, %s, %s)
            RETURNING id;
        """, (meta["name"], meta["description"], meta["license"], meta["origin_url"]))
        dataset_id = cur.fetchone()[0]
        conn.commit()
        print(f"新建数据集：{meta['name']}")
        return dataset_id

def insert_image_and_metadata(conn, dataset_id, json_data):
    with conn.cursor() as cur:
        image_id = str(uuid.uuid5(uuid.NAMESPACE_URL, json_data['IMG']))

        # 插入图像
        cur.execute("""
            INSERT INTO images (id, img_path, width, height, quality_score, aesthetic_score, dataset_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (
            image_id,
            json_data.get('IMG'),
            json_data.get('W'),
            json_data.get('H'),
            json_data.get('Q512'),
            json_data.get('A'),
            dataset_id
        ))

        # captions
        caption_rows = []
        for cap in json_data.get('CAP', []):
            caption_rows.append((image_id, cap, 'generic'))
        for hq_cap in json_data.get('HQ_CAP', []):
            caption_rows.append((image_id, hq_cap, 'hq'))
        if caption_rows:
            execute_values(cur, """
                INSERT INTO image_captions (image_id, caption, caption_type)
                VALUES %s ON CONFLICT DO NOTHING
            """, caption_rows)

        # tags
        tags = [tag.strip() for tag in json_data.get('DBRU_TAG', '').split(',') if tag.strip()]
        tag_rows = [(image_id, tag) for tag in tags]
        if tag_rows:
            execute_values(cur, """
                INSERT INTO image_tags (image_id, tag)
                VALUES %s ON CONFLICT DO NOTHING
            """, tag_rows)

        # pose
        for idx, pose in enumerate(json_data.get('POSE_KPTS', [])):
            cur.execute("""
                INSERT INTO image_pose (image_id, pose_index, bbox, invalid_kpts_idx, kpts_x, kpts_y)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (
                image_id,
                idx,
                pose.get('BBOX'),
                pose.get('INVLD_KPTS_IDX'),
                pose.get('KPTS_X'),
                pose.get('KPTS_Y')
            ))

        # features
        cur.execute("""
            INSERT INTO image_features (image_id, semantic_center, aesthetic_eat, watermark_prob)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (
            image_id,
            json_data.get('A_CENTER'),
            json_data.get('A_EAT'),
            json_data.get('HAS_WATERMARK')
        ))

        conn.commit()
        print(f"插入图像 {image_id} 成功")

def main():
    data = json.loads(json_str)
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        dataset_id = insert_dataset(conn, DATASET_META)
        print(f"创建数据集成功，UUID：{dataset_id}")
        insert_image_and_metadata(conn, dataset_id, data)
    except Exception as e:
        raise e#print("发生错误:", e)
    finally:
        conn.close()

if __name__ == '__main__':
    main()