import React, { useEffect, useRef, useState } from 'react';
import Macy from 'macy';
import imagesLoaded from 'imagesloaded';
import ImageItem from './ImageItem';
import { ImageInfo } from '../App';

type Props = {
  page: number;
  pageSize: number;
  onSelectImage: (image: ImageInfo) => void;
};

export default function ImageGrid({ page, pageSize, onSelectImage }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/images?page=${page}&size=${pageSize}`);
      const data = await res.json();
      setImages(data.images);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [page, pageSize]);

  useEffect(() => {
    if (containerRef.current) {
      imagesLoaded(containerRef.current, () => {
        new Macy({
          container: containerRef.current!,
          trueOrder: false,
          waitForImages: true,
          margin: 16,
          columns: 6,
          breakAt: {
            1600: 6,
            1200: 5,
            992: 4,
            768: 3,
            576: 2,
            0: 1,
          },
        });
      });
    }
  }, [images]);

  return (
    <>
      {loading && <div id="loading">加载中...</div>}
      <div id="image-container" ref={containerRef}>
        {images.map((image, idx) => (
          <ImageItem key={idx} src={image.url} onClick={() => onSelectImage(image)} />
        ))}
      </div>
    </>
  );
}