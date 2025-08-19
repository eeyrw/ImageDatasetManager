import psycopg2
import matplotlib
matplotlib.use('Agg')  # 使用非交互式后端
import matplotlib.pyplot as plt
import os

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "image_dataset_db4",
    "user": "postgres",
    "password": "example"
}

OUTPUT_DIR = "analysis_results"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def fetch_distribution(query):
    """执行 SQL 获取分布数据 [(bucket, count), ...]"""
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    cur.execute(query)
    data = cur.fetchall()
    cur.close()
    conn.close()
    return data

def compute_distribution(
    min_val: float,
    max_val: float,
    num_buckets: int,
    sql_expr: str,
    where_clause: str
):
    """
    通用分布统计函数
    - sql_expr: SQL 表达式计算数值，比如 width::float/height 或 sqrt(width*height)
    - where_clause: SQL 过滤条件
    """
    query = f"""
        SELECT width_bucket({sql_expr}, {min_val}, {max_val}, {num_buckets}) AS bucket,
               count(*) AS cnt
        FROM images
        WHERE {where_clause}
        GROUP BY bucket
        ORDER BY bucket;
    """
    data = fetch_distribution(query)
    # 映射成桶区间和数量
    bucket_width = (max_val - min_val) / num_buckets
    labels = [f"{min_val + (b-1)*bucket_width:.2f}~{min_val + b*bucket_width:.2f}" for b, _ in data]
    counts = [cnt for _, cnt in data]
    return labels, counts

def plot_distribution(labels, counts, title, xlabel, filename, log_y=False):
    """根据分布数据绘制图片"""
    x_pos = range(len(labels))
    plt.figure(figsize=(12, 6))
    plt.bar(x_pos, counts, width=0.9, edgecolor='black', color='skyblue')
    plt.title(title)
    plt.xlabel(xlabel)
    plt.ylabel('数量')
    if log_y:
        plt.yscale('log')
    plt.xticks(x_pos, labels, rotation=45, ha='right')
    plt.tight_layout()
    plt.grid(True, linestyle='--', alpha=0.5)
    save_path = os.path.join(OUTPUT_DIR, filename)
    plt.savefig(save_path)
    plt.close()
    return save_path

def analyze_to_images(
    ratio_min=0, ratio_max=3, ratio_buckets=30,
    size_min=0, size_max=3000, size_buckets=50,
    log_y=False
):
    """生成图片文件分析"""
    results = []

    # 宽高比
    ratio_labels, ratio_counts = compute_distribution(
        min_val=ratio_min,
        max_val=ratio_max,
        num_buckets=ratio_buckets,
        sql_expr="width::float / height",
        where_clause="width IS NOT NULL AND height IS NOT NULL AND height <> 0"
    )
    ratio_path = plot_distribution(
        ratio_labels, ratio_counts,
        "图片宽高比分布", "宽高比区间", "ratio_distribution.png",
        log_y=log_y
    )
    results.append(ratio_path)

    # 图片尺寸
    size_labels, size_counts = compute_distribution(
        min_val=size_min,
        max_val=size_max,
        num_buckets=size_buckets,
        sql_expr="sqrt(width::float * height)",
        where_clause="width IS NOT NULL AND height IS NOT NULL"
    )
    size_path = plot_distribution(
        size_labels, size_counts,
        "图片尺寸分布", "图片尺寸区间 sqrt(width*height)", "size_distribution.png",
        log_y=log_y
    )
    results.append(size_path)

    return results

def analyze(
    ratio_min=0, ratio_max=3, ratio_buckets=30,
    size_min=0, size_max=3000, size_buckets=50
):
    """返回 JSON 分布数据，供前端 Chart 渲染"""
    ratio_labels, ratio_counts = compute_distribution(
        min_val=ratio_min,
        max_val=ratio_max,
        num_buckets=ratio_buckets,
        sql_expr="width::float / height",
        where_clause="width IS NOT NULL AND height IS NOT NULL AND height <> 0"
    )
    size_labels, size_counts = compute_distribution(
        min_val=size_min,
        max_val=size_max,
        num_buckets=size_buckets,
        sql_expr="sqrt(width::float * height)",
        where_clause="width IS NOT NULL AND height IS NOT NULL"
    )
    return {
        "ratio_distribution": [{"range": r, "count": c} for r, c in zip(ratio_labels, ratio_counts)],
        "size_distribution": [{"range": r, "count": c} for r, c in zip(size_labels, size_counts)],
    }
