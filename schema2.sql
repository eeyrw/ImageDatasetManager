-- 启用 PostgreSQL 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

--------------------------------------------------------------------------------
-- 数据集表
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),   -- 主键
  name TEXT,                                        -- 数据集名称
  description TEXT,                                 -- 数据集描述
  dir_path TEXT UNIQUE NOT NULL,                    -- 物理目录路径
  license TEXT,                                     -- 许可信息
  origin_url TEXT,                                  -- 来源URL
  created_at TIMESTAMPTZ DEFAULT now()              -- 创建时间
);

--------------------------------------------------------------------------------
-- 文件表（图片信息）
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),   -- 图片唯一标识
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,                          -- 相对路径
  file_hash BYTEA,                                  -- SHA256 哈希
  file_size BIGINT,                                 -- 文件大小
  file_format TEXT,                                 -- 文件格式
  last_modified TIMESTAMPTZ,                        -- 文件最后修改时间
  created_at TIMESTAMPTZ DEFAULT now(),             -- 记录创建时间
  width INTEGER,                                    -- 宽度
  height INTEGER,                                   -- 高度
  semantic_center REAL[],                           -- 语义中心点 [x,y]
  aesthetic_eat REAL,                               -- 审美指标
  watermark_prob REAL,                              -- 水印概率
  quality_score REAL,                               -- 质量评分
  aesthetic_score REAL,                             -- 审美评分
  image_embedding REAL[],                           -- 图片嵌入

  -- 回收站相关字段
  is_deleted BOOLEAN DEFAULT FALSE,                 -- 是否删除
  deleted_at TIMESTAMPTZ,                           -- 删除时间
  deleted_by TEXT,                                  -- 删除人

  UNIQUE (dataset_id, file_path)
);

--------------------------------------------------------------------------------
-- 图片描述表
CREATE TABLE image_captions (
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  caption TEXT NOT NULL,
  caption_type TEXT DEFAULT 'generic',
  PRIMARY KEY (image_id, caption, caption_type)
);

--------------------------------------------------------------------------------
-- 图片标签表
CREATE TABLE image_tags (
  image_id UUID PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE,
  tags TEXT[] NOT NULL
);

--------------------------------------------------------------------------------
-- 人体关键点表
CREATE TABLE image_pose (
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  pose_index INTEGER,
  bbox REAL[],
  invalid_kpts_idx INTEGER[],
  kpts_x REAL[],
  kpts_y REAL[],
  PRIMARY KEY (image_id, pose_index)
);

--------------------------------------------------------------------------------
-- 回收站日志表
CREATE TABLE recycle_bin_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('DELETE', 'RESTORE')),
  action_at TIMESTAMPTZ DEFAULT now(),
  action_by TEXT,
  reason TEXT
);

--------------------------------------------------------------------------------
-- 索引优化
CREATE INDEX idx_images_dataset_id ON images(dataset_id);
CREATE INDEX idx_images_file_hash ON images(file_hash);
CREATE INDEX idx_image_captions_caption_trgm ON image_captions USING gin (caption gin_trgm_ops);
CREATE INDEX idx_image_tags_tags_gin ON image_tags USING gin (tags);
CREATE INDEX idx_images_quality_score ON images(quality_score);
CREATE INDEX idx_images_aesthetic_score ON images(aesthetic_score);
CREATE INDEX idx_images_width ON images(width);
CREATE INDEX idx_images_height ON images(height);
CREATE INDEX idx_recycle_bin_log_image_id ON recycle_bin_log(image_id);

--------------------------------------------------------------------------------
-- 触发器函数：自动写入回收站日志
CREATE OR REPLACE FUNCTION log_recycle_bin_action()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted THEN
    IF NEW.is_deleted = TRUE THEN
      INSERT INTO recycle_bin_log(image_id, action, action_by, reason)
      VALUES (NEW.id, 'DELETE', NEW.deleted_by, '用户删除');
    ELSE
      INSERT INTO recycle_bin_log(image_id, action, action_by)
      VALUES (NEW.id, 'RESTORE', NEW.deleted_by);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--------------------------------------------------------------------------------
-- 触发器绑定到 images 表
CREATE TRIGGER trg_images_recycle_log
AFTER UPDATE OF is_deleted ON images
FOR EACH ROW
EXECUTE FUNCTION log_recycle_bin_action();
