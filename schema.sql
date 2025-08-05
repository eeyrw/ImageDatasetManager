-- 启用 uuid-ossp 扩展，用于生成 UUID 类型的主键
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 数据集表，存储每个数据集的元信息
CREATE TABLE datasets (
  -- 主键，UUID 类型，自动生成随机唯一值
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- 数据集名称，唯一且不能为空
  name TEXT UNIQUE NOT NULL,
  -- 数据集描述信息
  description TEXT,
  -- 许可证信息
  license TEXT,
  -- 数据集来源链接（URL）
  origin_url TEXT,
  -- 记录创建时间，默认当前时间
  created_at TIMESTAMP DEFAULT now()
);

-- 图像表，存储所有图片的基本信息及所属数据集
CREATE TABLE images (
  -- 主键，UUID 类型，自动生成随机唯一值
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- 图片文件路径
  img_path TEXT,
  -- 图片宽度（像素）
  width INTEGER,
  -- 图片高度（像素）
  height INTEGER,
  -- 质量评分（如 Q512）
  quality_score REAL,
  -- 美学评分（如 A）
  aesthetic_score REAL,
  -- 所属数据集 ID，外键关联 datasets 表
  dataset_id UUID REFERENCES datasets(id) ON DELETE RESTRICT
);

-- 图片描述表，支持多条描述及描述类型标记
CREATE TABLE image_captions (
  -- 关联的图片 ID，外键引用 images 表
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  -- 描述文本
  caption TEXT,
  -- 描述类型，默认 'generic'，可扩展如 'hq', 'ocr', 'alt_text' 等
  caption_type TEXT DEFAULT 'generic',
  -- 主键为 (image_id, caption) 联合键，避免同一图片重复相同描述
  PRIMARY KEY (image_id, caption)
);

-- 图片标签表，存储图片对应的多个标签
CREATE TABLE image_tags (
  -- 关联的图片 ID，外键引用 images 表
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  -- 标签文本
  tag TEXT,
  -- 主键为 (image_id, tag) 联合键，避免同一图片重复相同标签
  PRIMARY KEY (image_id, tag)
);

-- 图片人体关键点表，存储多个人体姿势关键点信息
CREATE TABLE image_pose (
  -- 关联的图片 ID，外键引用 images 表
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  -- 姿势索引，表示第几个姿势
  pose_index INTEGER,
  -- 人体边界框 [x_min, y_min, x_max, y_max]
  bbox REAL[],
  -- 无效关键点索引数组
  invalid_kpts_idx INTEGER[],
  -- 关键点 X 坐标数组
  kpts_x REAL[],
  -- 关键点 Y 坐标数组
  kpts_y REAL[],
  -- 主键为 (image_id, pose_index) 联合键，唯一标识一张图的某个人体姿势
  PRIMARY KEY (image_id, pose_index)
);

-- 图片额外特征表，存储语义中心点、美学分数及水印概率
CREATE TABLE image_features (
  -- 关联的图片 ID，外键引用 images 表，主键
  image_id UUID PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE,
  -- 语义中心点坐标数组 [x, y]
  semantic_center REAL[],
  -- 美学 EAT 评分
  aesthetic_eat REAL,
  -- 水印概率
  watermark_prob REAL
);
