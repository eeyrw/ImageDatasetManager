import datetime
import sqlalchemy as sa
from sqlalchemy import (
    Column, String, Integer, BigInteger, Text, ForeignKey, UniqueConstraint,
    PrimaryKeyConstraint, Index, Float, TIMESTAMP, ARRAY
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY as PG_ARRAY, CHAR
import uuid

Base = declarative_base()

def default_uuid():
    return str(uuid.uuid4())

class Dataset(Base):
    __tablename__ = 'datasets'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False, unique=True)
    description = Column(Text)
    license = Column(Text)
    origin_url = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()'))

    # 反向关联
    dirs = relationship('DatasetDir', cascade="all, delete-orphan", back_populates='dataset')
    images = relationship('Image', cascade="all, delete-orphan", back_populates='dataset')

class DatasetDir(Base):
    __tablename__ = 'dataset_dirs'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey('datasets.id', ondelete='CASCADE'), nullable=False)
    dir_path = Column(Text, nullable=False, unique=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()'))

    dataset = relationship('Dataset', back_populates='dirs')
    files = relationship('File', cascade="all, delete-orphan", back_populates='dataset_dir')

class File(Base):
    __tablename__ = 'files'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_dir_id = Column(UUID(as_uuid=True), ForeignKey('dataset_dirs.id', ondelete='CASCADE'), nullable=False)
    file_path = Column(Text, nullable=False)
    file_hash = Column(CHAR(64))
    file_size = Column(BigInteger)
    file_format = Column(Text)
    last_modified = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()'))

    __table_args__ = (
        UniqueConstraint('dataset_dir_id', 'file_path', name='uq_files_dataset_dir_file_path'),
    )

    dataset_dir = relationship('DatasetDir', back_populates='files')
    images = relationship('Image', back_populates='file')
    captions = relationship('ImageCaption', cascade="all, delete-orphan", back_populates='file')
    tags = relationship('ImageTag', uselist=False, cascade="all, delete-orphan", back_populates='file')
    poses = relationship('ImagePose', cascade="all, delete-orphan", back_populates='file')
    features = relationship('ImageFeature', uselist=False, cascade="all, delete-orphan", back_populates='file')

class Image(Base):
    __tablename__ = 'images'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='RESTRICT'), nullable=False)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey('datasets.id', ondelete='RESTRICT'), nullable=False)

    __table_args__ = (
        UniqueConstraint('dataset_id', 'file_id', name='uq_images_dataset_file'),
        Index('idx_images_dataset_id', 'dataset_id'),
        Index('idx_images_file_id', 'file_id'),
    )

    file = relationship('File', back_populates='images')
    dataset = relationship('Dataset', back_populates='images')

class ImageCaption(Base):
    __tablename__ = 'image_captions'
    file_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='CASCADE'), nullable=False)
    caption = Column(Text, nullable=False)
    caption_type = Column(Text, nullable=False, server_default='generic')

    __table_args__ = (
        PrimaryKeyConstraint('file_id', 'caption', 'caption_type', name='pk_image_captions'),
    )

    file = relationship('File', back_populates='captions')

class ImageTag(Base):
    __tablename__ = 'image_tags'
    file_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='CASCADE'), primary_key=True)
    tags = Column(PG_ARRAY(Text), nullable=False)

    file = relationship('File', back_populates='tags')

    __table_args__ = (
        Index('idx_image_tags_tags_gin', 'tags', postgresql_using='gin'),
    )

class ImagePose(Base):
    __tablename__ = 'image_pose'
    file_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='CASCADE'), nullable=False)
    pose_index = Column(Integer, nullable=False)
    bbox = Column(PG_ARRAY(Float))
    invalid_kpts_idx = Column(PG_ARRAY(Integer))
    kpts_x = Column(PG_ARRAY(Float))
    kpts_y = Column(PG_ARRAY(Float))

    __table_args__ = (
        PrimaryKeyConstraint('file_id', 'pose_index', name='pk_image_pose'),
    )

    file = relationship('File', back_populates='poses')

class ImageFeature(Base):
    __tablename__ = 'image_features'
    file_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='CASCADE'), primary_key=True)
    width = Column(Integer)
    height = Column(Integer)
    semantic_center = Column(PG_ARRAY(Float))
    aesthetic_eat = Column(Float)
    watermark_prob = Column(Float)
    quality_score = Column(Float)
    aesthetic_score = Column(Float)

    file = relationship('File', back_populates='features')
