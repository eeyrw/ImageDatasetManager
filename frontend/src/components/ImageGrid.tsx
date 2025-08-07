import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import Masonry from 'react-masonry-css';

export type ImageInfo = {
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
  const [totalItems, setTotalItems] = useState(0);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!collection || selectedIds.length === 0) {
      setImages([]);
      setTotalPages(1);
      setTotalItems(0);
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
        setTotalItems(total);
        setTotalPages(Math.max(1, Math.ceil(total / pageSize)));
      } catch (e) {
        console.error('加载失败', e);
        setImages([]);
        setTotalPages(1);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [collection, selectedIds, page, pageSize]);

  // 切换 collection / ids 时重置页码
  useEffect(() => {
    setPage(0);
  }, [collection, selectedIds]);

  const breakpointColumnsObj = {
    default: 6,
    1600: 5,
    1200: 4,
    992: 3,
    768: 2,
    576: 1,
  };

  return (
    <div className="main-grid-panel">
      <div className="image-scroll-container">
        <Navbar
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          totalPages={totalPages}
          totalItems={totalItems}
        />
        {loading && <div id="loading">加载中...</div>}
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="my-masonry-grid"
          columnClassName="my-masonry-grid_column"
        >
          {images.map((img) => (
            <div key={img.id} className="image-item" onClick={() => onSelectImage(img)}>
              <img src={img.url} loading="lazy" />
            </div>
          ))}
        </Masonry>
      </div>
    </div>
  );
}
