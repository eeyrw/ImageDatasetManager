#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Parquet -> PostgreSQL 同步工具（封装为 ParquetSyncer 类）
- 支持 dry-run（可查询数据库但不写入、不提交）
- 保留并使用你最开始的处理函数（process_tags / generate_pose_index / explode_caption / process_table 等）
- dry-run 会打印每个表将写入的行数与前 5 条样例，并在结束时打印汇总
"""

import polars as pl
from pathlib import Path
from psycopg2.extras import execute_values
import psycopg2
from tqdm import tqdm
import uuid
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict
from LocalDatasetHelper import DatasetDectector

# --------------------------- 示例数据库配置（请按需修改） ---------------------------
DB_CONFIG = {
    'dbname': 'image_dataset_db4',
    'user': 'postgres',
    'password': 'example',
    'host': 'localhost',
    'port': 5432
}


# --------------------------- 辅助函数（尽量保留你原始实现的逻辑） ---------------------------

def process_tags(df: pl.DataFrame, col: str, context: Dict) -> pl.DataFrame:
    """
    将逗号分隔的字符串列拆成 tags list
    - 如果原值为空，输出空列表
    - 返回带有新列 'tags' 的 DataFrame
    """
    return df.with_columns(
        pl.when(pl.col(col).is_null())
        .then([])
        .otherwise(
            pl.col(col)
            .str.split(",")
            .list.eval(pl.element().str.strip_chars(), parallel=True)
        )
        .alias("tags")
    )


def generate_pose_index(df: pl.DataFrame, col: str, context: Dict) -> pl.DataFrame:
    """
    将 POSE_KPTS 做 explode 并生成 pose_index，拆出子字段：
      - 原始字段结构假设为 struct 包含 BBOX, INVLD_KPTS_IDX, KPTS_X, KPTS_Y
    注意：这里我们把 INVLD_KPTS_IDX 映射为 invalid_kpts_idx（以配合 mapping）。
    """
    # explode 指定列（会把每个 image 的多个 pose 展开成多行）
    df = df.explode(col).drop_nulls()

    # 从 struct 中拆字段，并重命名为小写（并修正 invld -> invalid）
    # 原始字段名：BBOX, INVLD_KPTS_IDX, KPTS_X, KPTS_Y
    # 我们希望输出列名：bbox, invalid_kpts_idx, kpts_x, kpts_y
    if col in df.columns:
        # 使用 struct.field 提取
        df = df.with_columns([
            pl.col(col).struct.field("BBOX").alias("bbox"),
            pl.col(col).struct.field(
                "INVLD_KPTS_IDX").alias("invalid_kpts_idx"),
            pl.col(col).struct.field("KPTS_X").alias("kpts_x"),
            pl.col(col).struct.field("KPTS_Y").alias("kpts_y"),
        ])
    # 生成 pose_index（在同一个 image_id 上按出现顺序编号）
    # 注意：要求外层 DF 上已经存在 image_id 列
    df = df.with_columns(pl.arange(0, pl.len()).over(
        "image_id").alias("pose_index"))

    return df


def explode_caption(df: pl.DataFrame, col: str, context: Dict) -> pl.DataFrame:
    """
    将 CAP/HQ_CAP 列按行展开，并为每条 caption 标注类型:
      - CAP    -> type = "generic"
      - HQ_CAP -> type = "hq"
    输出列：
      - caption (文本)
      - type    (类型)
    """
    type_map = {"CAP": "generic", "HQ_CAP": "hq"}
    ctype = type_map.get(col, "generic")

    # 按行展开列表列，丢掉空值
    out = df.explode(col).drop_nulls()

    # 统一文本列命名，并清洗空白
    out = out.with_columns(
        pl.col(col).cast(pl.Utf8).str.strip_chars().alias("caption"),
    )

    # 标注类型列
    out = out.with_columns(
        pl.lit(ctype).alias("type")
    )

    return out


# --------------------------- ParquetSyncer 类（封装主流程与 dry-run 行为） ---------------------------

class ParquetSyncer:
    """
    Parquet -> PostgreSQL 同步器

    用法示例（文件底部有完整示例）：
      syncer = ParquetSyncer(db_config=DB_CONFIG, root_dataset_dir="/path/to/datasets", dry_run=True)
      syncer.run([images_mapping, poses_mapping, captions_mapping, tags_mapping])
    """

    def __init__(self, db_config: Dict[str, Any], root_dataset_dir: str, dry_run: bool = False):
        """
        :param db_config: psycopg2 连接配置 dict
        :param root_dataset_dir: Parquet 根目录
        :param dry_run: 是否 dry-run（True：只做查询，不写入、不提交）
        """
        self.db_config = db_config
        self.root_dataset_dir = Path(root_dataset_dir)
        self.dry_run = dry_run
        self.conn: Optional[psycopg2.extensions.connection] = None

        # dry-run 汇总统计（仅用于 dry_run=True）
        # tables_counts: table_name -> number of rows would be inserted
        # tables_samples: table_name -> list of sample rows (最多保留前 5)
        self.tables_counts = defaultdict(int)
        self.tables_samples = defaultdict(list)

    # ---------- 数据库连接管理 ----------
    def connect_db(self):
        """
        建立数据库连接（注意：dry-run 也会建立连接以便执行 SELECT）
        """
        self.conn = psycopg2.connect(**self.db_config)

    def close_db(self):
        """关闭数据库连接"""
        if self.conn:
            self.conn.close()
            self.conn = None

    # ---------- dataset 行为 ----------
    def get_or_create_dataset(self, cur, dataset_root_dir: str, parquet_dir: Path) -> str:
        """
        获取或创建 datasets 表记录
          - 查询 datasets (dir_path)
          - 如果存在返回 id
          - 如果不存在：dry-run 模式只打印将创建的信息并返回随机 uuid；非 dry-run 模式实际 INSERT 并返回数据库 id

        dataset_root_dir: root path string（用于计算相对路径），通常为 self.root_dataset_dir
        parquet_dir: Parquet 文件所在目录（Path）
        """
        parquet_path = Path(parquet_dir)
        dataset_root_path = Path(dataset_root_dir)
        dataset_name = parquet_path.name
        parent_of_dataset_root = dataset_root_path.parent

        try:
            rel_dir_path = str(
                parquet_path.relative_to(parent_of_dataset_root))
        except ValueError:
            rel_dir_path = str(parquet_path)

        # 查询是否已有该记录（SELECT 始终执行）
        cur.execute("SELECT id FROM datasets WHERE dir_path = %s",
                    (rel_dir_path,))
        row = cur.fetchone()
        if row:
            return row[0]

        # 如果不存在：dry-run 下不插入，直接打印并返回临时 id
        if self.dry_run:
            print(
                f"[DRY-RUN] Would create dataset: name={dataset_name}, dir_path={rel_dir_path}")
            return str(uuid.uuid4())

        # 正常写入
        cur.execute("""
            INSERT INTO datasets (name, dir_path, created_at)
            VALUES (%s, %s, now())
            RETURNING id
        """, (dataset_name, rel_dir_path))
        return cur.fetchone()[0]

    def generate_or_fetch_image_id(self, cur, df: pl.DataFrame, dataset_id: str) -> pl.DataFrame:
        """
        给 DataFrame 生成 image_id：
        - 先查询数据库已有的 image_id（SELECT 总是允许）
        - 对于不存在的文件路径，用 sha1(dataset_id + path) 生成固定 UUID
        返回带有 image_id 列的 DataFrame
        """
        img_paths = df["IMG"].to_list()
        # SELECT 操作（dry-run 也会运行）
        cur.execute("""
            SELECT file_path, id
            FROM images
            WHERE dataset_id = %s AND file_path = ANY(%s)
        """, (dataset_id, img_paths))
        existing = dict(cur.fetchall())

        def _get_or_create_uuid(img_path: str) -> str:
            if img_path in existing:
                return existing[img_path]
            else:
                # 生成 deterministic UUID（使用 sha1 的前 32 hex 字符）
                h = hashlib.sha1(
                    f"{dataset_id}/{img_path}".encode("utf-8")).hexdigest()
                return str(uuid.UUID(h[:32]))

        # ✅ 正确写法
        return df.with_columns(
            pl.col("IMG").map_elements(_get_or_create_uuid,
                                       return_dtype=pl.Utf8).alias("image_id")
        )

    # ---------- 批量 insert/update ----------

    def insert_or_update(self, cur, table_name: str, columns: List[str], records: List[tuple],
                         pk_cols: List[str], update_mode: str = "overwrite"):
        """
        批量插入/更新
          - dry-run: 不执行写操作，打印信息并把统计记入 self.tables_counts / samples
          - 非 dry-run: 使用 execute_values 批量写入（带 ON CONFLICT ... DO UPDATE）
        """
        if not records:
            return

        if self.dry_run:
            # 记录统计信息并打印样例
            self.tables_counts[table_name] += len(records)
            # 保留至多前 5 条样例
            existing_samples = self.tables_samples[table_name]
            for r in records:
                if len(existing_samples) < 5:
                    existing_samples.append(r)
                else:
                    break
            print(
                f"[DRY-RUN] Would insert {len(records)} rows into '{table_name}' columns={columns}")
            # for r in records[:5]:
            #     print("   sample:", r)
            return

        # 非 dry-run：构造 ON CONFLICT 更新 SQL
        non_pk_cols = [c for c in columns if c not in pk_cols]
        update_sql = ""
        if non_pk_cols:
            if update_mode == "overwrite":
                update_sql = ", ".join(
                    [f"{c}=EXCLUDED.{c}" for c in non_pk_cols])
            elif update_mode == "null_only":
                update_sql = ", ".join(
                    [f"{c}=COALESCE(EXCLUDED.{c},{table_name}.{c})" for c in non_pk_cols])
            else:
                raise ValueError(
                    "update_mode must be 'overwrite' or 'null_only'")

        sql = f"""
        INSERT INTO {table_name} ({','.join(columns)})
        VALUES %s
        """
        if update_sql:
            sql += f" ON CONFLICT ({','.join(pk_cols)}) DO UPDATE SET {update_sql}"

        # 使用 execute_values 批量提交
        execute_values(cur, sql, records)

    def process_table(self, df: pl.DataFrame, mapping: Dict[str, Any], context: Dict[str, Any] = {}) -> Tuple[List[tuple], List[str]]:
        """
        将 Parquet DataFrame 转为可插入数据库的 records

        参数：
        - df: 原始 DataFrame
        - mapping: 单个表的 mapping 配置（见下面的 mapping 示例）
        - context: 可选上下文（例如 dataset_id，或 generate_image_id 函数等）

        返回：
        - records: list of tuples（可直接传递给 execute_values）
        - target_columns: 列顺序（与 records 中的顺序一致）
        """
        df_proc = df.clone()

        # 处理 mapping 中每一条 rule
        for parquet_col, rule in mapping["rules"].items():
            # 简单字符串或列表：直接重命名列
            if isinstance(rule, str) or isinstance(rule, list):
                target_cols = rule if isinstance(rule, list) else [rule]
                for tgt in target_cols:
                    if parquet_col in df_proc.columns:
                        df_proc = df_proc.rename({parquet_col: tgt})
                    elif mapping.get("ignore_if_missing", False):
                        # 忽略缺失列
                        continue
                    else:
                        raise ValueError(f"Column '{parquet_col}' not found")
            # 复杂规则：有 func 和 target 列
            elif isinstance(rule, dict):
                func = rule.get("func", None)
                target_cols = rule.get("target", [])
                if func is None:
                    raise ValueError(
                        f"Complex rule for '{parquet_col}' must have 'func'")
                df_proc = func(df_proc, parquet_col, context)
                # 检查 func 是否产生了目标列
                missing = [c for c in target_cols if c not in df_proc.columns]
                if missing:
                    raise ValueError(
                        f"After processing '{parquet_col}', missing columns: {missing}")
            else:
                raise ValueError(f"Invalid rule type for '{parquet_col}'")

        if mapping["table"] == "images" and "dataset_id" in context:
            df_proc = df_proc.with_columns(
                pl.lit(context["dataset_id"]).alias("dataset_id")
            )


        # 主键生成（如果定义了主键生成函数）
        pk_info = mapping.get("primaryKey", {})
        pk_cols = pk_info.get("columns", [])
        pk_func = pk_info.get("func", None)
        if pk_func:
            df_proc = pk_func(df_proc, context)
            missing_pks = [c for c in pk_cols if c not in df_proc.columns]
            if missing_pks:
                raise ValueError(f"Primary key columns missing: {missing_pks}")

        # 最终列顺序：先按 rules 收集，再把主键追加（防止主键丢失）
        target_columns: set[str] = set()
        for rule in mapping["rules"].values():
            if isinstance(rule, str):
                target_columns.add(rule)
            elif isinstance(rule, list):
                target_columns.update(rule)
            elif isinstance(rule, dict):
                target_columns.update(rule["target"])
        for pk in pk_cols:
            if pk not in target_columns:
                target_columns.add(pk)

        # 针对主键去重（如果定义了主键）
        if pk_cols:
            df_proc = df_proc.unique(subset=pk_cols)

        # 按目标列选取并转换为 records（list of tuples）
        # 注意：如果某些列不存在 above 将在 earlier 的检查阶段触发异常
        records = df_proc.select(target_columns).rows()
        # 将内部 list 转为 tuple（execute_values 接受 iterable of sequences，这里 list 也可）
        #records = [tuple(r.to_list()) for r in records]
        return records, target_columns

    # ---------- 主流程 ----------
    def run(self, mappings: List[Dict[str, Any]]):
        """
        主执行入口：
          - 遍历 root_dataset_dir 下所有 parquet 文件
          - 对每个文件执行映射并写入数据库（或 dry-run 打印）
        :param mappings: mapping 列表（每个 mapping 形如你给出的 images_mapping 等）
        """
        parquet_detector = DatasetDectector(self.root_dataset_dir)
        parquet_detector.scanDir(True)

        parquet_files = []
        for imageInfoFileList in parquet_detector.imageInfoFilesInDir:
            for imageInfoFile in imageInfoFileList:
                ext = imageInfoFile.suffix.lower()
                if ext == ".json":
                    pass  # 不处理JSON
                elif ext == ".parquet":
                    parquet_files.append(imageInfoFile)

        if not parquet_files:
            print("No parquet files found under", str(self.root_dataset_dir))
            return

        # 建立数据库连接（dry-run 也建立连接以便 SELECT）
        self.connect_db()
        try:
            with self.conn.cursor() as cur:
                # 遍历 parquet 文件
                for pq_file in tqdm(parquet_files, desc="Sync Parquet Files"):
                    # 1) 获取或创建 dataset（注意：get_or_create_dataset 中 SELECT 总会执行，
                    #    dry-run 下不会 INSERT）
                    dataset_id = self.get_or_create_dataset(
                        cur, str(self.root_dataset_dir), pq_file.parent)

                    # 2) 读取 parquet 到 polars DataFrame
                    df = pl.read_parquet(pq_file)

                    # 3) 生成或获取 image_id（会执行 SELECT 查询以获取已存在 image_id）
                    df = self.generate_or_fetch_image_id(cur, df, dataset_id)

                    context = {
                        "dataset_id": dataset_id,
                    }

                    # 5) 对每个 mapping 执行 process_table -> insert_or_update
                    for mapping in mappings:
                        records, columns = self.process_table(
                            df, mapping, context)
                        self.insert_or_update(cur,
                                              mapping["table"],
                                              columns,
                                              records,
                                              mapping["primaryKey"]["columns"],
                                              mapping.get("update_mode", "overwrite"))

            # 6) 如果不是 dry-run，提交事务；dry-run 则不 commit（不写入）
            if not self.dry_run:
                self.conn.commit()
                print("Committed changes to database.")
            else:
                print("[DRY-RUN] No changes committed to database. Summary below:")
                # dry-run 汇总输出
                for table_name, count in self.tables_counts.items():
                    print(f"  table '{table_name}': would insert {count} rows")
                    # samples = self.tables_samples.get(table_name, [])
                    # for s in samples:
                    #     print("     sample:", s)

        finally:
            self.close_db()


# --------------------------- mapping 定义（与最开始你给的一致） ---------------------------
# 注意：这些 mapping 使用上面定义的处理函数（generate_pose_index、explode_caption、process_tags）
images_mapping = {
    "table": "images",
    "rules": {
        "IMG": "file_path",
        "image_id": "id",  # ✅ 新增
        "dataset_id": "dataset_id",  # 仅 images 表
        "W": "width",
        "H": "height",
        'A_CENTER': 'semantic_center',
        'A_EAT': 'aesthetic_eat',
        'HAS_WATERMARK': 'watermark_prob',
        'Q512': 'quality_score',
        'A': 'aesthetic_score',
        'IMG_EMBD': 'image_embedding'
    },
    "primaryKey": {
        "columns": ["id"]
    },
    "update_mode": "null_only",
    "ignore_if_missing": True
}

poses_mapping = {
    "table": "image_pose",
    "rules": {
        # POSE_KPTS 由 generate_pose_index 处理并产出 ['image_id','pose_index','bbox','invalid_kpts_idx','kpts_x','kpts_y']
        "POSE_KPTS": {
            "target": ["image_id", "pose_index", "bbox", "invalid_kpts_idx", "kpts_x", "kpts_y"],
            "func": generate_pose_index
        }
    },
    "primaryKey": {
        "columns": ["image_id", "pose_index"]
    },
    "update_mode": "overwrite",
    "ignore_if_missing": True
}

captions_mapping = {
    "table": "image_captions",
    "rules": {
        "CAP": {
            "target": ["type", "caption"],
            "func": explode_caption
        },
        "HQ_CAP": {
            "target": ["type", "caption"],
            "func": explode_caption
        }
    },
    "primaryKey": {
        "columns": ["image_id", "type", "caption"]
    },
    "update_mode": "overwrite",
    "ignore_if_missing": True
}

tags_mapping = {
    "table": "image_tags",
    "rules": {
        "DBRU_TAG": {
            "target": ["tags"],
            "func": process_tags
        }
    },
    "primaryKey": {
        "columns": ["image_id"]
    },
    "update_mode": "overwrite",
    "ignore_if_missing": True
}

ALL_MAPPINGS = [images_mapping]#, poses_mapping, captions_mapping, tags_mapping]


# --------------------------- CLI / main 使用示例 ---------------------------
if __name__ == "__main__":
    # 你可以在这里修改 root_dataset_dir 与 dry_run
    root_dataset_dir = "/mnt/yuansnas/Backup/big_server/ds/DiffusionDataset"
    syncer = ParquetSyncer(db_config=DB_CONFIG,
                           root_dataset_dir=root_dataset_dir, dry_run=False)

    # 运行（dry-run=True：仅查询、打印样例、不会写入）
    syncer.run(ALL_MAPPINGS)
