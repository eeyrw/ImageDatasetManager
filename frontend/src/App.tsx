import React, { useState } from 'react';
import CollectionSelector from './components/CollectionSelector';
import ImageGrid from './components/ImageGrid';
import ImageDetails, { FieldConfig } from './components/ImageDetails';
import { ImageInfo } from './components/ImageGrid';
import { Layout, Card } from 'antd';
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
    { key: 'id', type: 'text', label: 'UUID' },
    { key: 'height', type: 'number', label: '高度' },
    { key: 'width', type: 'number', label: '宽度' },
    { key: 'tags', type: 'tags', label: '标签' },
    { key: 'score', type: 'number', label: '分数' },
    { key: 'path', type: 'text', label: '路径' },
  ];
  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f6fa' }}>
      <Sider width={300} style={{ background: '#fff', borderRight: '1px solid #eee', padding: 0 }}>
        <Card title="数据集/收藏夹" bordered={false} bodyStyle={{ padding: 16 }} style={{ height: '100%', borderRadius: 0, boxShadow: 'none' }}>
          <CollectionSelector onSelect={handleSelect} />
        </Card>
      </Sider>
      <Layout>
        <Content style={{ padding: 0, minHeight: 0, height: '100vh', overflow: 'auto' }}>
          <ImageGrid collection={collection} selectedIds={selectedIds} onSelectImage={setSelectedImage} />
        </Content>
      </Layout>
      <Sider width={200} style={{ background: '#fff', borderLeft: '1px solid #eee', padding: 0 }}>
        <Card title="图片详情" bordered={false} bodyStyle={{ padding: 16 }} style={{ height: '100%', borderRadius: 0, boxShadow: 'none' }}>
          <ImageDetails data={selectedImage} fields={fields} />
        </Card>
      </Sider>
    </Layout>
  );
}
