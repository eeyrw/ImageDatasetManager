import React, { useEffect, useRef, useState } from 'react';
import Navbar from './Navbar';
import imagesLoaded from 'imagesloaded';
import Macy from 'macy';

type ImageInfo = {
  id: string;
  url: string;
  title: string;
  height: number;
  score: number;
  tags: string[];
  path: string;
};

type Props = {
  collection: 'dataset' | 'favourite' | null;
  selectedIds: string[];
  onSelectImage: (image: ImageInfo) => void;
};

const baseUrl = import.meta.env.VITE_API_BASE_URL;

export default function ImageGrid({ collection, selectedIds, onSelectImage }: Props) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const macyRef = useRef<Macy | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 初始化 Macy
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

  // 强制重排 Macy
  const recalculateMacy = () => {
    if (macyRef.current) {
      macyRef.current.recalculate(true);
    }
  };

  // 监听滚动容器变化时触发重排
  useEffect(() => {
    const scrollContainer = document.querySelector('.image-scroll-container');
    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', recalculateMacy);
    return () => {
      scrollContainer.removeEventListener('scroll', recalculateMacy);
    };
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
          body: JSON.stringify({ collection, ids: selectedIds, page, pageSize }),
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

  // 切换数据源时回到第一页
  useEffect(() => {
    setPage(0);
  }, [collection, selectedIds]);

  // 图片加载完成后重新布局
  useEffect(() => {
    if (!containerRef.current || !macyRef.current) return;

    imagesLoaded(containerRef.current, () => {
      macyRef.current?.recalculate(true);
    });
  }, [images]);

  return (
    <div className="main-grid-panel">
      <Navbar
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        totalPages={totalPages}
      />
      <div className="image-scroll-container">
        {loading && <div id="loading">加载中...</div>}
        <div id="image-container" ref={containerRef}>
          {images.map((img, i) => (
            <div key={i} className="image-item" onClick={() => onSelectImage(img)}>
              <img src={img.url} loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
