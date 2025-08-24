import polars as pl
import duckdb
import psycopg2

# -------------------------
# PostgreSQL 连接
# -------------------------
pg_conn = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="image_dataset_db4",
    user="postgres",
    password="example"
)

# 指定要合并的数据集
target_datasets = ['Samji illustrator HEIC', 'Uran Duo HEIC']

# -------------------------
# 查询数据（忽略姿势表）
# -------------------------
# -------------------------
# 查询数据（忽略姿势表）
# -------------------------
query = """
SELECT
    i.id AS image_id,
    d.name AS dataset_name,
    i.file_path,
    i.file_hash,
    i.file_size,
    i.file_format,
    i.width,
    i.height,
    i.semantic_center,
    i.aesthetic_eat,
    i.watermark_prob,
    i.quality_score,
    i.aesthetic_score,
    c.caption,
    c.caption_type,
    t.tags
FROM images i
JOIN datasets d ON i.dataset_id = d.id
LEFT JOIN image_captions c ON i.id = c.image_id
LEFT JOIN image_tags t ON i.id = t.image_id
WHERE d.name = ANY(%s)
"""

# -------------------------
# 执行查询
# -------------------------
with pg_conn.cursor() as cur:
    cur.execute(query, (target_datasets,))
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()

# -------------------------
# 转成 Polars DataFrame
# -------------------------
df = pl.DataFrame(rows, schema=columns, orient="row")  # 指定按行构造，避免警告

# -------------------------
# 写入 Parquet 文件
# -------------------------
parquet_file = "merged_datasets.parquet"
df.write_parquet(parquet_file, compression="snappy")  # 可以选择 snappy、zstd 等压缩

print(f"导出完成: {parquet_file}")