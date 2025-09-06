import uuid
from sqlalchemy import (
    Column, LargeBinary, PrimaryKeyConstraint, String, Integer, BigInteger, Text, Float, TIMESTAMP, UniqueConstraint,
    ForeignKey, Index, ARRAY, Boolean, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID, REAL, CHAR
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text)
    description = Column(Text)
    dir_path = Column(Text, nullable=False, unique=True)
    license = Column(Text)
    origin_url = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default="now()")

    images = relationship("Image", cascade="all, delete-orphan", back_populates="dataset")


class Image(Base):
    __tablename__ = "images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(Text, nullable=False)  # 相对路径
    file_hash = Column(LargeBinary)           # 改成 BYTEA
    file_size = Column(BigInteger)
    file_format = Column(Text)
    last_modified = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default="now()")
    width = Column(Integer)
    height = Column(Integer)
    semantic_center = Column(ARRAY(REAL))
    aesthetic_eat = Column(REAL)
    watermark_prob = Column(REAL)
    quality_score = Column(REAL)
    aesthetic_score = Column(REAL)
    image_embedding = Column(ARRAY(REAL))

    # 回收站相关字段
    is_deleted = Column(Boolean, nullable=False, server_default="false")
    deleted_at = Column(TIMESTAMP(timezone=True))
    deleted_by = Column(Text)

    __table_args__ = (
        UniqueConstraint("dataset_id", "file_path", name="uq_images_dataset_file_path"),
        Index("idx_images_dataset_id", "dataset_id"),
        Index("idx_images_file_hash", "file_hash"),
        Index("idx_images_quality_score", "quality_score"),
        Index("idx_images_aesthetic_score", "aesthetic_score"),
        Index("idx_images_width", "width"),
        Index("idx_images_height", "height"),
    )

    dataset = relationship("Dataset", back_populates="images")
    captions = relationship("ImageCaption", cascade="all, delete-orphan", back_populates="image")
    tags = relationship("ImageTag", cascade="all, delete-orphan", uselist=False, back_populates="image")
    poses = relationship("ImagePose", cascade="all, delete-orphan", back_populates="image")
    recycle_logs = relationship("RecycleBinLog", cascade="all, delete-orphan", back_populates="image")


class ImageCaption(Base):
    __tablename__ = "image_captions"

    image_id = Column(UUID(as_uuid=True), ForeignKey("images.id", ondelete="CASCADE"), nullable=False)
    caption = Column(Text, nullable=False)
    caption_type = Column(Text, nullable=False, server_default="generic")

    __table_args__ = (
        PrimaryKeyConstraint("image_id", "caption", "caption_type", name="pk_image_captions"),
        Index(
            "idx_image_captions_caption_trgm",
            "caption",
            postgresql_using="gin",
            postgresql_ops={"caption": "gin_trgm_ops"},
        ),
    )

    image = relationship("Image", back_populates="captions")


class ImageTag(Base):
    __tablename__ = "image_tags"

    image_id = Column(UUID(as_uuid=True), ForeignKey("images.id", ondelete="CASCADE"), primary_key=True)
    tags = Column(ARRAY(Text), nullable=False)

    __table_args__ = (
        Index("idx_image_tags_tags_gin", "tags", postgresql_using="gin"),
    )

    image = relationship("Image", back_populates="tags")


class ImagePose(Base):
    __tablename__ = "image_pose"

    image_id = Column(UUID(as_uuid=True), ForeignKey("images.id", ondelete="CASCADE"), nullable=False)
    pose_index = Column(Integer, nullable=False)
    bbox = Column(ARRAY(REAL))
    invalid_kpts_idx = Column(ARRAY(Integer))
    kpts_x = Column(ARRAY(REAL))
    kpts_y = Column(ARRAY(REAL))

    __table_args__ = (
        PrimaryKeyConstraint("image_id", "pose_index", name="pk_image_pose"),
    )

    image = relationship("Image", back_populates="poses")


class RecycleBinLog(Base):
    __tablename__ = "recycle_bin_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    image_id = Column(UUID(as_uuid=True), ForeignKey("images.id", ondelete="CASCADE"), nullable=False)
    action = Column(Text, nullable=False)
    action_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default="now()")
    action_by = Column(Text)
    reason = Column(Text)

    __table_args__ = (
        CheckConstraint("action IN ('DELETE', 'RESTORE')", name="ck_recycle_action"),
        Index("idx_recycle_bin_log_image_id", "image_id"),
    )

    image = relationship("Image", back_populates="recycle_logs")
