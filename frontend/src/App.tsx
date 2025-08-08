import React, { useState } from 'react';
import CollectionSelector from './components/CollectionSelector';
import ImageGrid from './components/ImageGrid';
import ImageDetails, { FieldConfig } from './components/ImageDetails';
import { ImageInfo } from './components/ImageGrid';
import { Layout, Card, Splitter } from 'antd';
const { Sider, Content } = Layout;

export default function App() {
  const [collection, setCollection] = useState<'dataset' | 'favourite' | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null);

  const handleSelect = (type: 'dataset' | 'favourite', ids: string[]) => {
    setCollection(ids.length > 0 ? type : null);
    setSelectedIds(ids);
  };

  // 可根据需要自定义 fields 配置
  const fields: FieldConfig[] = [
    { key: 'url', type: 'image', label: '图片' },
    { key: 'title', type: 'text', label: '描述' },
    { key: 'size', type: 'size', label: '尺寸' },
    { key: 'tags', type: 'tags', label: '标签' },
    { key: 'score_quality', type: 'number', label: '画质评分' },
    { key: 'score_aesthetics', type: 'number', label: '美学评分' },
    { key: 'path', type: 'text', label: '路径' },
  ];
  return (

    <Splitter style={{ minHeight: '100vh', boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
      <Splitter.Panel collapsible defaultSize="20%" min="10%" max="70%">
        <Card title="数据集/收藏夹" bordered={false} bodyStyle={{ padding: 16 }} style={{ height: '100%', borderRadius: 0, boxShadow: 'none' }}>
          <CollectionSelector onSelect={handleSelect} />
        </Card>
      </Splitter.Panel>
      <Splitter.Panel style={{ padding: 0, minHeight: 0, height: '100vh', overflow: 'auto' }}>
        <ImageGrid collection={collection} selectedIds={selectedIds} onSelectImage={setSelectedImage} />
      </Splitter.Panel>
      <Splitter.Panel collapsible defaultSize="15%" min="10%" max="70%">
        <Card title="图片详情" bordered={false} bodyStyle={{ padding: 16 }} style={{ height: '100%', borderRadius: 0, boxShadow: 'none' }}>
          <ImageDetails data={selectedImage} fields={fields} />
        </Card>
      </Splitter.Panel>
    </Splitter>
  );
}
