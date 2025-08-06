import React, { useEffect, useRef, useState } from 'react';
import Navbar from './Navbar';
import ImageDetails from './ImageDetails';
import imagesLoaded from 'imagesloaded';
import Macy from 'macy';

type Props = {
  collection: 'dataset' | 'favourite' | null;
  selectedIds: string[]; // UUID 列表
};

type ImageInfo = {
  id: string;
  url: string;
  title: string;
  height: number;
  score: number;
  tags: string[];
  path: string;
};

const baseUrl = import.meta.env.VITE_API_BASE_URL;

export default function ImageGrid({  collection, selectedIds }: Props) {
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

  // 加载图片数据
  useEffect(() => {
    if (!collection || selectedIds.length === 0) {
      setImages([]);
      setTotalPages(1);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${baseUrl}/api/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collection, ids: selectedIds,page,pageSize }),
        });
        const data = await res.json();
        setImages(data.images || []);
        const total = data.total || 0;
        setTotalPages(Math.max(1, Math.ceil(total / pageSize)));
      } catch (e) {
        console.error('加载失败', e);
        setImages([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [collection, selectedIds, page, pageSize]);



  
  // 如果切换了数据源，则重置页码
  useEffect(() => {
    setPage(0);
  }, [collection, selectedIds]);

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
