import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import Masonry from 'react-masonry-css';
import { Gallery, Item } from 'react-photoswipe-gallery';
import 'photoswipe/dist/photoswipe.css'


export type ImageInfo = {
  id: string;
  url: string;
  raw_size_image_url: string;
  title: string;
  size: { w: number, h: number }
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
  const [pageSize, setPageSize] = useState(100);
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
        {loading && <div className="loading-overlay">加载中...</div>}

        {/* 1. Gallery 包裹整个 Masonry 图片列表 */}
        <Gallery withCaption>
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {images.map((img) => (
              // 2. Item 包裹每张图片
              <Item
                key={img.id}
                original={img.raw_size_image_url}      // 大图链接
                thumbnail={img.url}     // 缩略图链接（可同大图）
                width={img.size.w}
                height={img.size.h}
                caption={img.title}
              >
                {/* 3. render prop 返回带 ref 的触发元素 */}
                {({ ref, open }) => (
                  <div
                    ref={ref}           // 必须绑定这个 ref
                    className="image-item"
                    onClick={() => onSelectImage(img)}  // 单击显示信息
                    style={{ cursor: 'pointer' }}
                  >
                    <img src={img.url} onClick={open} ref={ref} loading="lazy" alt={img.title} />
                  </div>
                )}
              </Item>
            ))}
          </Masonry>
        </Gallery>
      </div>
    </div >
  );
}
