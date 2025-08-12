import React, { ReactNode, useEffect, useState } from 'react';
import Navbar from './Navbar';
import Masonry from 'react-masonry-css';
import { Gallery, Item } from 'react-photoswipe-gallery';
import 'photoswipe/dist/photoswipe.css'
import ImageItem from './ImageItem';
import { Switch, Button, Space } from "antd";


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
  onClickImage: (image: ImageInfo) => void;
  header?: ReactNode;  // 新增 header 可选属性

};

const baseUrl = import.meta.env.VITE_API_BASE_URL;

export default function ImageGrid({ collection, selectedIds, onClickImage, header }: Props) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]); // 选中图片ID
  const [highlightEnabled, setHighlightEnabled] = useState(false);  // 新增开关状态

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

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedImageIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  // 新增：全选当前页所有图片
  const selectAll = () => {
    const currentPageIds = images.map((img) => img.id);
    setSelectedImageIds((prev) => {
      // 合并去重
      const merged = new Set([...prev, ...currentPageIds]);
      return Array.from(merged);
    });
  };

  // 新增：反选当前页图片
  const inverseSelect = () => {
    const currentPageIds = images.map((img) => img.id);
    setSelectedImageIds((prev) => {
      const newSelected = new Set(prev);
      currentPageIds.forEach((id) => {
        if (newSelected.has(id)) {
          newSelected.delete(id);
        } else {
          newSelected.add(id);
        }
      });
      return Array.from(newSelected);
    });
  };

  // 新增：取消选择当前页所有图片
  const clearSelection = () => {
    const currentPageIds = images.map((img) => img.id);
    setSelectedImageIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
  };

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
      {/* 新增 header 渲染区域 */}
      {header && (
        <div className="image-grid-header">
          {header}
        </div>
      )}

      <div className="image-scroll-container">

        {loading && <div className="loading-overlay">加载中...</div>}
        <div className='image-operation-panel'
          style={{
            display: "flex",
            flexDirection: "column",  // 垂直排列
            flexWrap: "wrap",
            position: "sticky",
            top: 0,           // 关键：指定距离顶部的位置
            zIndex: 10,       // 置顶层级，避免被覆盖
            width: "100%",     // 建议撑满容器宽度
          }}
        >
          <Navbar
            page={page}
            setPage={setPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            totalPages={totalPages}
            totalItems={totalItems}
          />
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", padding: 12 }}>
            <Space>
              <Button size="small" onClick={selectAll}>全选</Button>
              <Button size="small" onClick={inverseSelect}>反选</Button>
              <Button size="small" onClick={clearSelection}>取消选择</Button>
            </Space>

            <Space>
              <span style={{ userSelect: "none" }}>高亮选中</span>
              <Switch checked={highlightEnabled} onChange={setHighlightEnabled} size="small" />
            </Space>
          </div>
        </div>

        {/* 1. Gallery 包裹整个 Masonry 图片列表 */}
        <Gallery withCaption>
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {images.map((img) => {
              const isSelected = selectedImageIds.includes(img.id);

              return (
                <Item
                  key={img.id}
                  original={img.raw_size_image_url}
                  thumbnail={img.url}
                  width={img.size.w}
                  height={img.size.h}
                  caption={img.title}
                >
                  {({ ref, open }) => (
                    <ImageItem
                      ref={ref}
                      src={img.url}
                      checked={isSelected}
                      highlighted={!highlightEnabled || selectedImageIds.length === 0 || isSelected}
                      onCheckedChange={(val) => toggleSelect(img.id, val)}
                      onClick={() => {
                        onClickImage(img);
                        open();
                      }}
                    />
                  )}
                </Item>
              );
            })}
          </Masonry>
        </Gallery>
      </div>
    </div >
  );
}
