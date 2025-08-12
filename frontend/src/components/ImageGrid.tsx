import React, { ReactNode, useEffect, useState } from 'react';
import Navbar from './Navbar';
import ImageGallery, { ImageInfo } from './ImageGallery';
import { Button, Modal, Space, Switch } from 'antd';
import AddToFavouriteButton from './AddToFavouriteButton';

const baseUrl = import.meta.env.VITE_API_BASE_URL;

type Props = {
  collection: 'dataset' | 'favourite' | null;
  selectedIds: string[];
  onClickImage: (image: ImageInfo) => void;
  header?: ReactNode;
  selectable?: boolean; // 是否允许选择，默认true
};

export default function ImageGrid({
  collection,
  selectedIds: externalSelectedIds,
  onClickImage,
  header,
  selectable = true,
}: Props) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [selectedImageMap, setSelectedImageMap] = useState<Record<string, ImageInfo>>({});
  const [highlightEnabled, setHighlightEnabled] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);



  // 负责同步选中列表和缓存
  const handleSelectChange = (newSelectedIds: string[]) => {
    // 找出新增的ID
    const addedIds = newSelectedIds.filter(id => !selectedImageIds.includes(id));
    // 找出取消的ID
    const removedIds = selectedImageIds.filter(id => !newSelectedIds.includes(id));

    // 从当前页images中找到新增的ImageInfo，加入缓存
    const newEntries = addedIds
      .map(id => images.find(img => img.id === id))
      .filter((img): img is ImageInfo => !!img)
      .reduce((acc, img) => {
        acc[img.id] = img;
        return acc;
      }, {} as Record<string, ImageInfo>);

    // 从缓存删除取消的ID
    const newCache = { ...selectedImageMap };
    removedIds.forEach(id => {
      delete newCache[id];
    });

    // 合并缓存
    setSelectedImageMap({ ...newCache, ...newEntries });

    // 更新ID列表
    setSelectedImageIds(newSelectedIds);
  };

  useEffect(() => {
    if (!collection || externalSelectedIds.length === 0) {
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
          body: JSON.stringify({ collection, ids: externalSelectedIds, page, pageSize }),
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
  }, [collection, externalSelectedIds, page, pageSize]);

  useEffect(() => {
    setPage(0);
    setSelectedImageIds([]);
  }, [collection, externalSelectedIds]);

  // 选择状态变更
  const onSelectedIdsChange = (ids: string[]) => {
    setSelectedImageIds(ids);
  };

  // 多选操作按钮逻辑
  const selectAll = () => {
    const allIds = images.map(img => img.id);
    handleSelectChange(allIds);
  };

  const inverseSelect = () => {
    const newSelected = new Set(selectedImageIds);
    images.forEach(img => {
      if (newSelected.has(img.id)) {
        newSelected.delete(img.id);
      } else {
        newSelected.add(img.id);
      }
    });
    handleSelectChange(Array.from(newSelected));
  };

  const clearSelection = () => {
    const currentPageIds = images.map(img => img.id);
    handleSelectChange(selectedImageIds.filter(id => !currentPageIds.includes(id)));
  };

  return (
    <div className="main-grid-panel">
      {header && <div className="image-grid-header">{header}</div>}

      <div className="image-scroll-container" style={{ position: 'relative' }}>
        {loading && <div className="loading-overlay">加载中...</div>}
        <div
          className="image-operation-panel"
          style={{
            display: 'flex',
            flexDirection: 'column', // 垂直排列
            flexWrap: 'wrap',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            width: '100%',
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              padding: 12,
            }}
          >
            <Space>
              <Button size="small" onClick={selectAll}>
                全选
              </Button>
              <Button size="small" onClick={inverseSelect}>
                反选
              </Button>
              <Button size="small" onClick={clearSelection}>
                取消选择
              </Button>
              <AddToFavouriteButton
                selectedImageIds={selectedImageIds}
                onSuccess={() => setSelectedImageIds([])} // 添加成功后清空选择
              />

              {/* 新增预览按钮 */}
              <Button size="small" onClick={() => setPreviewVisible(true)}>预览选中</Button>
            </Space>

            {/* 预览弹窗 */}
            <Modal
              visible={previewVisible}
              title="预览已选图片"
              footer={null}
              onCancel={() => setPreviewVisible(false)}
              width={800}
              bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
            >
              <ImageGallery
                images={Object.values(selectedImageMap)}
                selectedIds={selectedImageIds}
                onSelectedIdsChange={setSelectedImageIds}
                onClickImage={onClickImage}
                selectable={false}  // 预览时不允许选中操作
                highlightEnabled={false}
              />
            </Modal>
            <Space>
              <span style={{ userSelect: 'none' }}>高亮选中</span>
              <Switch
                checked={highlightEnabled}
                onChange={setHighlightEnabled}
                size="small"
              />
            </Space>
          </div>
        </div>

        {/* 图片瀑布流展示 */}
        <ImageGallery
          images={images}
          selectedIds={selectedImageIds}
          onSelectedIdsChange={handleSelectChange}
          onClickImage={onClickImage}
          selectable={selectable}
          highlightEnabled={highlightEnabled}
        />
      </div>
    </div>
  );
}
