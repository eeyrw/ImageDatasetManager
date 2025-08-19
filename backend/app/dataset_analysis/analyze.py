import psycopg2
from typing import List, Dict, Tuple

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "image_dataset_db4",
    "user": "postgres",
    "password": "example"
}

def fetch_distribution(query: str) -> List[Tuple[int, int]]:
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
    table: str,
    where_clause: str = "TRUE"
) -> Dict[str, List]:
    """
    通用分布统计函数
    - sql_expr: SQL 表达式计算数值，比如 width::float/height 或 sqrt(width*height)
    - table: SQL 表名
    - where_clause: SQL 过滤条件，默认不限制
    返回: { "labels": [...], "counts": [...] }
    """
    query = f"""
        SELECT width_bucket({sql_expr}, {min_val}, {max_val}, {num_buckets}) AS bucket,
               count(*) AS cnt
        FROM {table}
        WHERE {where_clause}
        GROUP BY bucket
        ORDER BY bucket;
    """
    data = fetch_distribution(query)
    bucket_width = (max_val - min_val) / num_buckets
    labels = [f"{min_val + (b-1)*bucket_width:.2f}~{min_val + b*bucket_width:.2f}" for b, _ in data]
    counts = [cnt for _, cnt in data]
    return {"labels": labels, "counts": counts}

def analyze_fields(
    fields: List[Dict],
) -> Dict[str, List[Dict[str, int]]]:
    """
    通用分析函数，可分析任意字段/表达式的数值分布
    fields 每个元素字典包含:
    {
        "name": "ratio_distribution",  # 返回的字段名
        "sql_expr": "width::float / height", # SQL 表达式
        "table": "images",  # 表名
        "min_val": 0,
        "max_val": 3,
        "num_buckets": 30,
        "where_clause": "width IS NOT NULL AND height IS NOT NULL AND height<>0"
    }
    """
    result = {}
    for f in fields:
        dist = compute_distribution(
            min_val=f["min_val"],
            max_val=f["max_val"],
            num_buckets=f["num_buckets"],
            sql_expr=f["sql_expr"],
            table=f.get("table", "images"),
            where_clause=f.get("where_clause", "TRUE")
        )
        # 转换成前端友好的格式
        result[f["name"]] = [{"range": r, "count": c} for r, c in zip(dist["labels"], dist["counts"])]
    return result

# 使用示例：
if __name__ == "__main__":
    fields_to_analyze = [
        {
            "name": "ratio_distribution",
            "sql_expr": "width::float / height",
            "table": "images",
            "min_val": 0,
            "max_val": 3,
            "num_buckets": 30,
            "where_clause": "width IS NOT NULL AND height IS NOT NULL AND height<>0"
        },
        {
            "name": "size_distribution",
            "sql_expr": "sqrt(width::float * height)",
            "table": "images",
            "min_val": 0,
            "max_val": 3000,
            "num_buckets": 50,
            "where_clause": "width IS NOT NULL AND height IS NOT NULL"
        }
    ]
    data = analyze_fields(fields_to_analyze)
    print(data)
