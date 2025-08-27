import { useCallback } from 'react';
import { message } from 'antd';
import { ImageInfo } from '../components/ImageGallery';

export function useImageActions(clickedImage: ImageInfo | null, setClickedImage: (cb: (prev: ImageInfo | null) => ImageInfo | null) => void) {
  const handleSave = useCallback(async (imgId: string, changes: Record<string, any>) => {
    if (!clickedImage) return;
    if (Object.keys(changes).length === 0) {
      message.info('没有修改内容');
      return;
    }
    // 假设 updateImageAPI 返回 Promise
    // await updateImageAPI(clickedImage.id, changes);
    console.log('提交更新:', imgId, changes);
    // 模拟失败：
    await new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        const fail = Math.random() < 0.5; // 50% 失败概率
        if (fail) reject(new Error('模拟保存失败'));
        else resolve();
      }, 1500);
    });
    setClickedImage((prev) => ({ ...prev!, ...changes }));
  }, [clickedImage, setClickedImage]);

  return { handleSave };
}
