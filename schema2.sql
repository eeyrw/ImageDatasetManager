-- 启用 PostgreSQL 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

--------------------------------------------------------------------------------
-- 数据集表，存储数据集基本信息
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),   -- 主键，自动生成UUID
  name TEXT UNIQUE NOT NULL,                        -- 数据集名称，唯一且非空
  description TEXT,                                 -- 数据集描述，可选
  dir_path TEXT UNIQUE NOT NULL,                    -- 物理目录路径，唯一且非空
  license TEXT,                                     -- 许可信息，可选
  origin_url TEXT,                                  -- 数据集来源URL，可选
  created_at TIMESTAMPTZ DEFAULT now()              -- 记录创建时间
);

--------------------------------------------------------------------------------
-- 文件表，管理具体文件信息
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),   -- 主键，文件唯一标识
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE, -- 所属数据集
  file_path TEXT NOT NULL,                          -- 文件相对路径（相对于 datasets.dir_path）
  file_hash CHAR(64),                               -- 文件内容哈希（SHA256）
  file_size BIGINT,                                 -- 文件大小（字节）
  file_format TEXT,                                 -- 文件格式
  last_modified TIMESTAMPTZ,                        -- 文件最后修改时间
  created_at TIMESTAMPTZ DEFAULT now(),             -- 记录创建时间
  width INTEGER,                                    -- 图片宽度
  height INTEGER,                                   -- 图片高度
  semantic_center REAL[],                           -- 语义中心点 [x, y]
  aesthetic_eat REAL,                               -- 审美指标之一
  watermark_prob REAL,                              -- 水印概率
  quality_score REAL,                               -- 质量评分
  aesthetic_score REAL,                             -- 审美评分
  UNIQUE (dataset_id, file_path)                    -- 同一数据集下文件路径唯一
);

--------------------------------------------------------------------------------
-- 图片描述表，一个文件可以有多条不同描述
CREATE TABLE image_captions (
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE, -- 外键
  caption TEXT NOT NULL,                                         -- 描述文本
  caption_type TEXT DEFAULT 'generic',                           -- 描述类型
  PRIMARY KEY (image_id, caption, caption_type)                  -- 防止重复
);

--------------------------------------------------------------------------------
-- 图片标签表，一条记录存储该文件所有标签（字符串数组）
CREATE TABLE image_tags (
  image_id UUID PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE, -- 主键及外键
  tags TEXT[] NOT NULL                                               -- 标签数组
);

--------------------------------------------------------------------------------
-- 人体关键点表，一个文件可能有多个人体姿态
CREATE TABLE image_pose (
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,    -- 外键
  pose_index INTEGER,                                       -- 姿态索引
  bbox REAL[],                                               -- 边界框
  invalid_kpts_idx INTEGER[],                                -- 无效关键点索引
  kpts_x REAL[],                                             -- 关键点X
  kpts_y REAL[],                                             -- 关键点Y
  PRIMARY KEY (image_id, pose_index)                         -- 防止重复
);

--------------------------------------------------------------------------------
-- 索引优化
-- 按数据集查图片
CREATE INDEX idx_images_dataset_id ON images(dataset_id);

-- 按哈希查图片（去重）
CREATE INDEX idx_images_file_hash ON images(file_hash);

-- 模糊搜索描述
CREATE INDEX idx_image_captions_caption_trgm 
  ON image_captions USING gin (caption gin_trgm_ops);

-- 按标签查
CREATE INDEX idx_image_tags_tags_gin 
  ON image_tags USING gin (tags);

-- 按评分范围查
CREATE INDEX idx_images_quality_score ON images(quality_score);
CREATE INDEX idx_images_aesthetic_score ON images(aesthetic_score);

-- 按宽高查
CREATE INDEX idx_images_width ON images(width);
CREATE INDEX idx_images_height ON images(height);
