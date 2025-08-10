-- 启用 PostgreSQL 扩展
-- uuid-ossp: 支持生成 UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- pg_trgm: 支持对文本进行 trigram 相似度搜索，提升模糊查询性能
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

--------------------------------------------------------------------------------
-- 数据集表，存储数据集基本信息
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- 主键，自动生成UUID，唯一标识数据集
  name TEXT UNIQUE NOT NULL,                         -- 数据集名称，唯一且非空
  description TEXT,                                  -- 数据集描述，可选
  license TEXT,                                      -- 许可信息，可选
  origin_url TEXT,                                   -- 数据集来源URL，可选
  created_at TIMESTAMPTZ DEFAULT now()               -- 记录创建时间，默认为当前时间
);

--------------------------------------------------------------------------------
-- 数据集目录表，表示数据集内不同物理目录
CREATE TABLE dataset_dirs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),   -- 主键，唯一目录ID
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,  -- 外键，所属数据集，数据集删除时级联删除目录
  dir_path TEXT UNIQUE NOT NULL,                      -- 物理目录路径，唯一且非空
  created_at TIMESTAMPTZ DEFAULT now()                -- 目录记录创建时间
);

--------------------------------------------------------------------------------
-- 文件表，管理具体文件信息
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),    -- 主键，文件唯一标识
  dataset_dir_id UUID NOT NULL REFERENCES dataset_dirs(id) ON DELETE CASCADE,  -- 所属目录，目录删除时级联删除文件
  file_path TEXT NOT NULL,                            -- 文件相对路径（相对于 dataset_dirs.dir_path）
  file_hash CHAR(64),                                 -- 文件内容哈希（如 SHA256），长度固定64字符，方便文件去重
  file_size BIGINT,                                   -- 文件大小（字节）
  file_format TEXT,                                   -- 文件格式（扩展名）
  last_modified TIMESTAMPTZ,                          -- 文件最后修改时间
  created_at TIMESTAMPTZ DEFAULT now(),               -- 记录创建时间
  UNIQUE (dataset_dir_id, file_path)                  -- 确保同一目录下文件路径唯一，不会重复
);

--------------------------------------------------------------------------------
-- 图片表，表示某数据集内的图片实体，关联文件和数据集
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),    -- 主键，唯一标识图片记录
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE RESTRICT,  -- 外键，关联文件，文件不能被删导致图片数据不一致
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE RESTRICT,  -- 外键，关联数据集，数据集不能删导致图片数据不一致
  UNIQUE (dataset_id, file_id)                        -- 复合唯一约束，确保同一数据集中不会重复引用同一个文件
);

-- 为加快基于数据集的查询，创建索引
CREATE INDEX idx_images_dataset_id ON images(dataset_id);

-- 为加快基于文件的查询，创建索引
CREATE INDEX idx_images_file_id ON images(file_id);

--------------------------------------------------------------------------------
-- 图片描述表，关联文件，一个文件可以有多条不同描述
CREATE TABLE image_captions (
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,  -- 外键，关联文件，文件删除则删除描述
  caption TEXT NOT NULL,                                         -- 描述文本，不允许为空
  caption_type TEXT DEFAULT 'generic',                          -- 描述类型，默认为 'generic'，可以区分普通描述、高质量描述等
  PRIMARY KEY (file_id, caption, caption_type)                  -- 复合主键，防止同一文件同类型描述重复
);

--------------------------------------------------------------------------------
-- 图片标签表，关联文件，一条记录存储该文件所有标签（字符串数组）
CREATE TABLE image_tags (
  file_id UUID PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,  -- 主键及外键，唯一关联文件，文件删除则删除标签
  tags TEXT[] NOT NULL                                               -- 标签数组，顺序有意义，不允许为空
);

-- 创建 GIN 索引，支持对 tags 数组的高效包含查询
CREATE INDEX idx_image_tags_tags_gin ON image_tags USING GIN (tags);

--------------------------------------------------------------------------------
-- 人体关键点表，关联文件，表示该文件对应的多个人体关键点姿态信息
CREATE TABLE image_pose (
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,    -- 外键，关联文件，文件删除则删除对应关键点数据
  pose_index INTEGER,                                     -- 关键点索引，用于区分同一文件的多个人体姿态
  bbox REAL[],                                           -- 人体边界框 [x_min, y_min, x_max, y_max]
  invalid_kpts_idx INTEGER[],                            -- 关键点中无效的索引列表
  kpts_x REAL[],                                         -- 关键点的X坐标数组
  kpts_y REAL[],                                         -- 关键点的Y坐标数组
  PRIMARY KEY (file_id, pose_index)                      -- 复合主键，保证同一文件中不同姿态唯一
);

--------------------------------------------------------------------------------
-- 图片特征表，关联文件，存储文件级别的图像特征信息
CREATE TABLE image_features (
  file_id UUID PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,  -- 主键及外键，唯一关联文件，文件删除则删除特征
  width INTEGER,                                                    -- 图片宽度（像素）
  height INTEGER,                                                   -- 图片高度（像素）
  semantic_center REAL[],                                           -- 语义中心点坐标 [x, y]
  aesthetic_eat REAL,                                               -- 审美指标之一
  watermark_prob REAL,                                              -- 水印概率
  quality_score REAL,                                               -- 质量评分
  aesthetic_score REAL                                             -- 审美评分
);
