-- 启用扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 数据集表
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  license TEXT,
  origin_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE dataset_dirs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  dir_path TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 文件表，管理文件路径、哈希等信息
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_dir_id UUID NOT NULL REFERENCES dataset_dirs(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,       -- 相对于 dataset_dirs.dir_path 的相对路径
  file_hash CHAR(64),            -- 文件内容哈希，比如 SHA256，长度固定64字符
  file_size BIGINT,
  file_format TEXT,
  last_modified TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (dataset_dir_id, file_path)  -- 同一物理目录下文件路径唯一
);

-- images 表不含宽高
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE RESTRICT
);

CREATE INDEX idx_images_dataset_id ON images(dataset_id);
CREATE INDEX idx_images_file_id ON images(file_id);

-- 图片描述表
CREATE TABLE image_captions (
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  caption TEXT NOT NULL,
  caption_type TEXT DEFAULT 'generic',
  PRIMARY KEY (image_id, caption)
);

-- 图片标签表，tags 用字符串数组，保留顺序
CREATE TABLE image_tags (
  image_id UUID PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE,
  tags TEXT[] NOT NULL
);

-- 给 tags 建 GIN 索引支持快速包含查询
CREATE INDEX idx_image_tags_tags_gin ON image_tags USING GIN (tags);

-- 图片人体关键点表
CREATE TABLE image_pose (
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  pose_index INTEGER,
  bbox REAL[],              -- [x_min, y_min, x_max, y_max]
  invalid_kpts_idx INTEGER[],
  kpts_x REAL[],
  kpts_y REAL[],
  PRIMARY KEY (image_id, pose_index)
);

-- image_features 表新增宽高字段
CREATE TABLE image_features (
  image_id UUID PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE,
  width INTEGER,
  height INTEGER,
  semantic_center REAL[],   -- [x, y]
  aesthetic_eat REAL,
  watermark_prob REAL,
  quality_score REAL,
  aesthetic_score REAL
);