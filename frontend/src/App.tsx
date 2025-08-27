import React from 'react';
import CollectionSelector from './components/CollectionSelector';
import ImageGrid from './components/ImageGrid';
import ImageDetails from './components/ImageDetails';
import { Card, Splitter } from 'antd';
import { fields } from './fieldConfigs';
import { useImageActions } from './hooks/useImageActions';
import { useImageManager } from './hooks/useImageManager';

export default function App() {
  // 用自定义 hook 管理所有图片相关状态
  const {
    collection,
    selectedIds,
    clickedImage,
    setClickedImage,
    handleSelectCollection,
    handleClickImage,
  } = useImageManager();

  // 图片保存逻辑由自定义hook提供
  const { handleSave } = useImageActions(clickedImage, setClickedImage);

  return (
    <Splitter style={{ minHeight: '100vh', boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
      <Splitter.Panel collapsible defaultSize="20%" min="10%" max="70%">
        <Card title="数据集/收藏夹" bordered={false} bodyStyle={{ padding: 16 }} style={{ height: '100%', borderRadius: 0, boxShadow: 'none' }}>
          <CollectionSelector onSelect={handleSelectCollection} />
        </Card>
      </Splitter.Panel>
      <Splitter.Panel style={{ padding: 0, minHeight: 0, height: '100vh', overflow: 'auto' }}>
        <ImageGrid
          collection={collection}
          selectedIds={selectedIds}
          onClickImage={handleClickImage}
        />
      </Splitter.Panel>
      <Splitter.Panel collapsible defaultSize="20%" min="10%" max="70%">
        <Card title="图片详情" bordered={false} bodyStyle={{ padding: 16 }} style={{ height: '100%', borderRadius: 0, boxShadow: 'none' }}>
          <ImageDetails
            data={clickedImage}
            fields={fields}
            onSave={handleSave}
          />
        </Card>
      </Splitter.Panel>
    </Splitter>
  );
}
