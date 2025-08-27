import { useState, useCallback } from 'react';
import { ImageInfo } from '../components/ImageGallery';

export function useImageManager() {
  // collection: 当前选择的数据集或收藏夹类型
  const [collection, setCollection] = useState<'dataset' | 'favourite' | null>(null);
  // selectedIds: 当前选中的数据集或收藏夹 id
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // clickedImage: 当前点击的图片详情
  const [clickedImage, setClickedImage] = useState<ImageInfo | null>(null);

  // 选择数据集/收藏夹
  const handleSelectCollection = useCallback((type: 'dataset' | 'favourite', ids: string[]) => {
    setCollection(ids.length > 0 ? type : null);
    setSelectedIds(ids);
    setClickedImage(null); // 切换集合时清空图片详情
  }, []);

  // 选中图片
  const handleClickImage = useCallback((img: ImageInfo) => {
    setClickedImage(img);
  }, []);

  // 可扩展更多业务逻辑

  return {
    collection,
    selectedIds,
    clickedImage,
    setClickedImage,
    handleSelectCollection,
    handleClickImage,
    setCollection,
    setSelectedIds,
  };
}
