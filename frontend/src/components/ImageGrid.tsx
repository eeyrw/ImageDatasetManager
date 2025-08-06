import React, { useEffect, useRef, useState } from 'react';
import Navbar from './Navbar';
import ImageDetails from './ImageDetails';
import imagesLoaded from 'imagesloaded';
import Macy from 'macy';

type Props = {
  selectedDatasets: string[];
};

type ImageInfo = {
  url: string;
  width: number;
  height: number;
  score: number;
  tags: string[];
  path: string;
};

export default function ImageGrid({ selectedDatasets }: Props) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null);

  const macyRef = useRef<Macy | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (macyRef.current === null) {
      macyRef.current = new Macy({
        container: '#image-container',
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
          0: 1
        }
      });
    }
  }, []);

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          size: String(pageSize),
          datasets: selectedDatasets.join(',')
        });

        const res = await fetch(`/api/images?${params.toString()}`);
        const data = await res.json();

        setImages(data.images || []);
        setTotalPages(Math.max(1, Math.ceil(data.total / pageSize)));

        imagesLoaded(containerRef.current!, () => {
          macyRef.current?.recalculate(true);
        });
      } catch (e) {
        console.error('加载图片失败', e);
        setImages([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [page, pageSize, selectedDatasets]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'row' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <Navbar
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          totalPages={totalPages}
        />

        {loading && <div id="loading">加载中...</div>}

        <div id="image-container" ref={containerRef}>
          {images.map((img, i) => (
            <div key={i} className="image-item" onClick={() => setSelectedImage(img)}>
              <img src={img.url} loading="lazy" />
            </div>
          ))}
        </div>
      </div>

      <ImageDetails image={selectedImage} onClose={() => setSelectedImage(null)} />
    </div>
  );
}
