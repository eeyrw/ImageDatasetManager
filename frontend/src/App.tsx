import React, { useState } from 'react';
import CollectionSelector from './components/CollectionSelector';
import ImageGrid from './components/ImageGrid';
import ImageDetails, { FieldConfig } from './components/ImageDetails';
import { ImageInfo } from './components/ImageGallery';
import DynamicQueryForm from "./components/DynamicQueryForm";
import { message, Card, Collapse, Splitter } from 'antd';
import ImageAnalysisChart from './components/ImageAnalysisChart';

export default function App() {
  const [collection, setCollection] = useState<'dataset' | 'favourite' | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clickedImage, setClickedImage] = useState<ImageInfo | null>(null);
  // 保存查询参数
  const [queryParams, setQueryParams] = useState(null);
  

  const handleSelect = (type: 'dataset' | 'favourite', ids: string[]) => {
    setCollection(ids.length > 0 ? type : null);
    setSelectedIds(ids);
  };
  // 查询回调
  const handleSearch = (params: any) => {
    console.log("用户提交的查询参数:", params);
    setQueryParams(params);

    // 这里你可以用 params 调用后端接口：
    // fetch(`/api/items?keyword=${params.keyword}&tags=${params.tags?.join(',')}&score_min=${params.score?.min}&score_max=${params.score?.max}`)
    //   .then(...)
  };

  const handleSave = async (imgId: string, changes: Record<string, any>) => {
    if (!clickedImage) return;
    if (Object.keys(changes).length === 0) {
      message.info('没有修改内容');
      return;
    }

    // 假设 updateImageAPI 返回 Promise
    // await updateImageAPI(clickedImage.id, changes);
    console.log('提交更新:', imgId,changes);
    // 模拟失败： 
    
    await new Promise<void>((resolve, reject) => {
          setTimeout(() => {
            const fail = Math.random() < 0.5; // 50% 失败概率
            if (fail) reject(new Error('模拟保存失败'));
            else resolve();
          }, 1500); // 延迟 1.5 秒
        });

    // 保存成功再更新 clickedImage
    setClickedImage((prev) => ({ ...prev!, ...changes }));

  };

  // 可根据需要自定义 fields 配置
  const fields: FieldConfig[] = [
    { key: 'url', type: 'image', label: '图片' },
    { key: 'caption_hq', type: 'texts', label: '描述-HQ', editable: true },
    { key: 'caption_generic', type: 'texts', label: '描述-GENERIC', editable: true },
    { key: 'size', type: 'size', label: '尺寸' },
    { key: 'tags', type: 'tags', label: '标签', editable: true },
    { key: 'quality_score', type: 'hist', label: '画质评分' },
    { key: 'aesthetic_eat', type: 'hist', label: '美学评分' },
    { key: 'watermark_prob', type: 'prob', label: '含水印概率' },
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
        {/* <ImageAnalysisChart /> */}
        <ImageGrid
          // header={<Collapse size="small" ghost={true}>
          //   <Collapse.Panel header="条件查询" key="1">
          //     <div style={{ padding: 24 }}>
          //       <DynamicQueryForm onSearch={handleSearch} />
          //       <h3>查询参数（打印）</h3>
          //       <pre>{queryParams ? JSON.stringify(queryParams, null, 2) : "尚未查询"}</pre>
          //     </div>
          //   </Collapse.Panel>
          // </Collapse>}
          collection={collection}
          selectedIds={selectedIds}
          onClickImage={setClickedImage} />
      </Splitter.Panel>
      <Splitter.Panel collapsible defaultSize="15%" min="10%" max="70%">
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
