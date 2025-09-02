import polars as pl
from pathlib import Path
from psycopg2.extras import execute_values
import psycopg2
from tqdm import tqdm
import uuid
import hashlib
from typing import List, Dict, Any

# --------------------------- 数据库配置 ---------------------------
DB_CONFIG = {
    'dbname': 'image_dataset_db4',
    'user': 'postgres',
    'password': 'example',
    'host': 'localhost',
    'port': 5432
}

def connect_db():
    """创建 PostgreSQL 连接"""
    return psycopg2.connect(**DB_CONFIG)

# --------------------------- Parquet 文件查找 ---------------------------
def find_parquet_files(root_dir: str) -> List[Path]:
    """递归查找 Parquet 文件"""
    root_path = Path(root_dir)
    return [p for p in root_path.rglob("*.parquet") if p.is_file()]

# --------------------------- Dataset 获取/创建 ---------------------------
def get_or_create_dataset(cur, dataset_root_dir: str, parquet_dir: Path) -> str:
    """获取或创建 datasets 表记录"""
    parquet_path = Path(parquet_dir)
    dataset_root_path = Path(dataset_root_dir)
    dataset_name = parquet_path.name
    parent_of_dataset_root = dataset_root_path.parent

    try:
        rel_dir_path = str(parquet_path.relative_to(parent_of_dataset_root))
    except ValueError:
        rel_dir_path = str(parquet_path)

    cur.execute("SELECT id FROM datasets WHERE dir_path = %s", (rel_dir_path,))
    row = cur.fetchone()
    if row:
        return row[0]

    cur.execute("""
        INSERT INTO datasets (name, dir_path, created_at)
        VALUES (%s, %s, now())
        RETURNING id
    """, (dataset_name, rel_dir_path))
    return cur.fetchone()[0]

# --------------------------- image_id 生成 ---------------------------
def generate_image_id(df: pl.DataFrame, context: Dict) -> pl.DataFrame:
    """根据 dataset_id + IMG 生成 image_id UUID"""
    dataset_id = context["dataset_id"]
    def _make_uuid(img_path: str) -> str:
        name = f"{dataset_id}/{img_path}"
        h = hashlib.sha1(name.encode("utf-8")).hexdigest()
        return str(uuid.UUID(h[:32]))
    return df.with_columns(pl.col("IMG").apply(_make_uuid).alias("image_id"))

def primaryKeyGenFunc(df: pl.DataFrame, context: Dict) -> pl.DataFrame:
    """通用主键生成函数"""
    return generate_image_id(df, context)

# --------------------------- 复杂字段处理 ---------------------------
def explode_list_field(df: pl.DataFrame, col: str) -> pl.DataFrame:
    """将 list/array 列拆成多行"""
    return df.explode(col).drop_nulls()

def process_tags(df: pl.DataFrame, col: str) -> pl.DataFrame:
    """将逗号分隔的字符串列拆成 tags list"""
    return df.with_columns(
        pl.when(pl.col(col).is_null()).then([]).otherwise(
            pl.col(col).str.split(",").arr.eval(pl.element().str.strip(), parallel=True)
        ).alias("tags")
    )

def generate_pose_index(df: pl.DataFrame, col: str, context: Dict) -> pl.DataFrame:
    """POSE_KPTS explode 并生成 pose_index"""
    df = df.explode(col).drop_nulls()
    for fld in ["BBOX","INVLD_KPTS_IDX","KPTS_X","KPTS_Y"]:
        df = df.with_columns(pl.col(col).struct.field(fld).alias(fld.lower()))
    df = df.with_columns(pl.arange(0, pl.count()).over("IMG").alias("pose_index"))
    if "dataset_id" in context and "generate_image_id" in context:
        df = context["generate_image_id"](df, context)
    return df

def explode_caption(df: pl.DataFrame, col: str, context: Dict) -> pl.DataFrame:
    """
    将 CAP/HQ_CAP 列按行展开，并为每条 caption 标注类型:
      - CAP    -> type = "generic"
      - HQ_CAP -> type = "hq"

    产出列：
      - 保留原列 (CAP 或 HQ_CAP)
      - 新增 caption (统一的文本列，来自原列的值，去掉首尾空白)
      - 新增 type    (上面映射得到)
      - 如果需要且缺失，利用 context 生成 image_id
    """
    type_map = {"CAP": "generic", "HQ_CAP": "hq"}
    ctype = type_map.get(col, "generic")

    out = df.explode(col).drop_nulls()

    # 统一文本列命名，并清洗空白
    out = out.with_columns(
        pl.col(col).cast(pl.Utf8).str.strip().alias("caption"),
    )

    # 标注类型列
    out = out.with_columns(pl.lit(ctype).alias("type"))

    # 如需补齐 image_id（当后续表需要且还未生成）
    if "dataset_id" in context and "generate_image_id" in context and "image_id" not in out.columns:
        out = context["generate_image_id"](out, context)

    return out


# --------------------------- TableMapping 处理 ---------------------------
def process_table(df: pl.DataFrame, mapping: Dict[str, Any], context: Dict[str, Any]={}) -> (List[tuple], List[str]):
    """将 Parquet DataFrame 转为可插入数据库的 records"""
    df_proc = df.clone()

    for parquet_col, rule in mapping["rules"].items():
        if isinstance(rule, str) or isinstance(rule, list):
            target_cols = rule if isinstance(rule, list) else [rule]
            for tgt in target_cols:
                if parquet_col in df_proc.columns:
                    df_proc = df_proc.rename({parquet_col: tgt})
                elif mapping.get("ignore_if_missing", False):
                    continue
                else:
                    raise ValueError(f"Column '{parquet_col}' not found")
        elif isinstance(rule, dict):
            func = rule.get("func", None)
            target_cols = rule.get("target", [])
            if func is None:
                raise ValueError(f"Complex rule for '{parquet_col}' must have 'func'")
            df_proc = func(df_proc, parquet_col, context)
            missing = [c for c in target_cols if c not in df_proc.columns]
            if missing:
                raise ValueError(f"After processing '{parquet_col}', missing columns: {missing}")
        else:
            raise ValueError(f"Invalid rule type for '{parquet_col}'")

    # 主键生成
    pk_info = mapping.get("primaryKey", {})
    pk_cols = pk_info.get("columns", [])
    pk_func = pk_info.get("func", None)
    if pk_func:
        df_proc = pk_func(df_proc, context)
        missing_pks = [c for c in pk_cols if c not in df_proc.columns]
        if missing_pks:
            raise ValueError(f"Primary key columns missing: {missing_pks}")

    # 最终列顺序
    target_columns = []
    for rule in mapping["rules"].values():
        if isinstance(rule, str):
            target_columns.append(rule)
        elif isinstance(rule, list):
            target_columns.extend(rule)
        elif isinstance(rule, dict):
            target_columns.extend(rule["target"])
    for pk in pk_cols:
        if pk not in target_columns:
            target_columns.append(pk)

    records = df_proc.select(target_columns).to_numpy().tolist()
    return records, target_columns

# --------------------------- 批量 insert/update ---------------------------
def insert_or_update(cur, table_name: str, columns: List[str], records: List[tuple], pk_cols: List[str], update_mode="overwrite"):
    """批量 insert/update"""
    if not records:
        return
    non_pk_cols = [c for c in columns if c not in pk_cols]
    update_sql = ""
    if non_pk_cols:
        if update_mode == "overwrite":
            update_sql = ", ".join([f"{c}=EXCLUDED.{c}" for c in non_pk_cols])
        elif update_mode == "null_only":
            update_sql = ", ".join([f"{c}=COALESCE(EXCLUDED.{c},{c})" for c in non_pk_cols])
        else:
            raise ValueError("update_mode must be 'overwrite' or 'null_only'")
    sql = f"""
    INSERT INTO {table_name} ({','.join(columns)})
    VALUES %s
    """
    if update_sql:
        sql += f" ON CONFLICT ({','.join(pk_cols)}) DO UPDATE SET {update_sql}"
    execute_values(cur, sql, records)

# --------------------------- TableMapping 示例 ---------------------------

images_mapping = {
    "table": "images",
    "rules": {
        "IMG": "file_path",
        "W": "width",
        "H": "height"
    },
    "primaryKey": {
        "columns": ["image_id"],
        "func": primaryKeyGenFunc
    },
    "update_mode": "null_only",
    "ignore_if_missing": True
}

poses_mapping = {
    "table": "image_pose",
    "rules": {
        "POSE_KPTS": {
            "target": ["image_id","pose_index","bbox","invalid_kpts_idx","kpts_x","kpts_y"],
            "func": generate_pose_index
        }
    },
    "primaryKey": {
        "columns": ["image_id","pose_index"],
        "func": primaryKeyGenFunc
    },
    "update_mode": "overwrite",
    "ignore_if_missing": True
}

captions_mapping = {
    "table": "image_captions",
    "rules": {
        "CAP": {
            "target": ["type","caption"],
            "func": explode_caption
        },
        "HQ_CAP": {
            "target": ["type","caption"],
            "func": explode_caption
        }
    },
    "primaryKey": {
        "columns": ["image_id","type","caption"]
    },
    "update_mode": "overwrite",
    "ignore_if_missing": True
}

tags_mapping = {
    "table": "image_tags",
    "rules": {
        "DBRU_TAG": {
            "target": ["IMG","tags"],
            "func": process_tags
        }
    },
    "primaryKey": {
        "columns": ["IMG","tags"]
    },
    "update_mode": "overwrite",
    "ignore_if_missing": True
}

# --------------------------- 主流程 ---------------------------
if __name__ == "__main__":
    root_dataset_dir = "/mnt/yuansnas/Backup/big_server/ds/DiffusionDataset"
    parquet_files = find_parquet_files(root_dataset_dir)

    conn = connect_db()
    try:
        with conn.cursor() as cur:
            for pq_file in tqdm(parquet_files, desc="Sync Parquet Files"):
                # 获取 dataset_id
                dataset_id = get_or_create_dataset(cur, root_dataset_dir, pq_file.parent)
                context = {
                    "dataset_id": dataset_id,
                    "generate_image_id": generate_image_id
                }

                # 读取 Parquet
                df = pl.read_parquet(pq_file)

                # 同步 images
                records, columns = process_table(df, images_mapping, context)
                insert_or_update(cur, images_mapping["table"], columns, records, images_mapping["primaryKey"]["columns"], images_mapping["update_mode"])

                # 同步 image_pose
                records, columns = process_table(df, poses_mapping, context)
                insert_or_update(cur, poses_mapping["table"], columns, records, poses_mapping["primaryKey"]["columns"], poses_mapping["update_mode"])

                # 同步 captions
                records, columns = process_table(df, captions_mapping, context)
                insert_or_update(cur, captions_mapping["table"], columns, records, captions_mapping["primaryKey"]["columns"], captions_mapping["update_mode"])

                # 同步 tags
                records, columns = process_table(df, tags_mapping, context)
                insert_or_update(cur, tags_mapping["table"], columns, records, tags_mapping["primaryKey"]["columns"], tags_mapping["update_mode"])

        conn.commit()
    finally:
        conn.close()
