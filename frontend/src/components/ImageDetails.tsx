import React from 'react';
import { ImageInfo } from 'ImageGrid';

export default function ImageDetails({ image }: { image: ImageInfo | null }) {
  if (!image) return <div className="side-panel">点击图片查看详情</div>;

  return (
    <div className="side-panel">
      <img src={image.url} style={{ width: '100%' }} />
      <p><strong>描述:</strong> {image.title}</p>
      <p><strong>UUID:</strong> {image.id}</p>
      <p><strong>尺寸:</strong> {image.width} x {image.height}</p>
      <p><strong>标签:</strong> {image.tags?.join(', ') || '无'}</p>
    </div>
  );
}