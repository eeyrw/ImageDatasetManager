import React, { ReactNode, useEffect, useState, useRef } from 'react';
import Navbar from './Navbar';
import ImageGallery, { ImageInfo } from './ImageGallery';
import { Button, Collapse, Flex, Input, Modal, Select, Space, Switch } from 'antd';
import { MeiliSearch } from 'meilisearch';
import RangeSlider, { RangeSliderStatus, SliderMode } from "./RangeSlider";
import { buildMeiliFilters } from './Utils';
import UnifiedSearchBox, { RefImageInfo } from './UnifiedSearchBox';

const { Panel } = Collapse;
const baseUrl = import.meta.env.VITE_API_BASE_URL;
const searchClient = new MeiliSearch({ host: 'http://localhost:7700' });

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
  const [query, setQuery] = useState('');   // 新增搜索关键字
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [highlightEnabled, setHighlightEnabled] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);  // 新增只看已选开关

  const [attributes, setAttributes] = useState<string[]>([]);
  const [selectedAttrs, setSelectedAttrs] = useState<string[]>([]);

  const [refImageInfo, setRefImageInfo] = useState<RefImageInfo | null>(null);

  // 每个字段对应一个 RangeSliderStatus
  const [sliders, setSliders] = useState<Record<string, RangeSliderStatus>>({
    aesthetic_eat: {
      sliderMode: "gte",
      value: [3, 5],
      rangeMode: "float",
      min: 0,
      max: 10,
      enabled: false,
    },
    quality_score: {
      sliderMode: "gte",
      value: [50, 70],
      rangeMode: "float",
      min: 0,
      max: 100,
      enabled: false,
    },
    watermark_prob: {
      sliderMode: "lte",
      value: [0, 1],
      rangeMode: "float",
      min: 0,
      max: 1,
      enabled: false,
    },
  });

  // 当某个 RangeSlider 改变时更新状态
  const handleSliderChange = (field: string, status: RangeSliderStatus) => {
    setSliders((prev) => ({ ...prev, [field]: status }));
  };


  const handleFindSimilar = (img: ImageInfo) => {
    setRefImageInfo({
      url:img.url,
      embedding:img._vectors.dinov3.embeddings[0]
    });
  }

  // 生成 MeiliSearch filter
  const meiliFilter = buildMeiliFilters(sliders);

  useEffect(() => {
    const fetchAttrs = async () => {
      try {
        const settings = await searchClient.index('images').getSettings();
        setAttributes(settings.searchableAttributes || []);
        if (settings.searchableAttributes?.length) {
          setSelectedAttrs(settings.searchableAttributes);
        }
      } catch (e) {
        console.error("无法获取 Meilisearch searchableAttributes", e);
      }
    };
    fetchAttrs();
  }, []);

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
        // 构造 filter: dataset_id IN [xxx]
        const filter = '(' + externalSelectedIds.map(id => `dataset_id = "${id}"`).join(' OR ') + ') ' + (meiliFilter ? 'AND (' + meiliFilter + ')' : '');

        let searchOption: Record<string, any> = {
          filter,
          limit: pageSize,
          offset: page * pageSize,
          attributesToSearchOn: selectedAttrs,
          retrieveVectors: true,
        }

        if (refImageInfo?.embedding && refImageInfo.embedding.length === 1024) {
          searchOption["hybrid"] = { embedder: "dinov3"};
          searchOption["vector"] = refImageInfo.embedding;
        }
        const res = await searchClient.index('images').search(query,
          searchOption);

        const formatted = res.hits.map(hit => ({
          ...hit,
          caption_hq: hit.captions['hq'],
          caption_generic: hit.captions['generic'],
          path: hit.dataset_dir + '/' + hit.file_path,
          size: { w: hit.width, h: hit.height }
        }));
        setImages(formatted as ImageInfo[]);
        const total = res.estimatedTotalHits || 0;
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
  }, [collection, externalSelectedIds, selectedAttrs, query, meiliFilter, refImageInfo, page, pageSize]);

  useEffect(() => {
    setPage(0);
    setSelectedImageIds([]);
  }, [collection, externalSelectedIds]);

  // 根据开关过滤图片
  const displayedImages = showOnlySelected
    ? images.filter(img => selectedImageIds.includes(img.id))
    : images;

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedImageIds(prev =>
      checked ? [...prev, id] : prev.filter(x => x !== id)
    );
  };

  const selectAll = () => {
    const currentPageIds = images.map(img => img.id);
    setSelectedImageIds(prev => {
      const setPrev = new Set(prev);
      currentPageIds.forEach(id => setPrev.add(id));
      return Array.from(setPrev);
    });
  };

  const inverseSelect = () => {
    const currentPageIds = images.map(img => img.id);
    setSelectedImageIds(prev => {
      const setPrev = new Set(prev);
      currentPageIds.forEach(id => {
        if (setPrev.has(id)) setPrev.delete(id);
        else setPrev.add(id);
      });
      return Array.from(setPrev);
    });
  };

  const clearSelection = () => {
    const currentPageIds = images.map(img => img.id);
    setSelectedImageIds(prev => prev.filter(id => !currentPageIds.includes(id)));
  };

  return (
    <div className="main-grid-panel">
      {header && <div className="image-grid-header">{header}</div>}


      {/* 搜索面板折叠 */}
      <Collapse defaultActiveKey={['search']} bordered={false}>
        <Panel header="搜索与筛选" key="search">
          <div style={{ display: 'flex', gap: 8, paddingBottom: 12 }}>
            <Select
              mode="multiple"
              style={{ minWidth: 300 }}
              value={selectedAttrs}
              onChange={setSelectedAttrs}
              options={attributes.map(attr => ({ value: attr, label: attr }))}
              placeholder="选择搜索字段"
            />
                      <UnifiedSearchBox
            query={query}
            onQueryChange={setQuery}
            refImage={refImageInfo}
            onRefImageChange={setRefImageInfo}
            onSearch={(q, refImg) => {
              setQuery(q);
              setRefImageInfo(refImg);
            }}
          />
            {/* <Input.Search
              placeholder="搜索图片标题或描述"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onSearch={val => setQuery(val)}
              enterButton
              allowClear
            /> */}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(sliders).map(([key, status]) => (
              <RangeSlider
                key={key}
                description={key}
                status={status}
                onChange={(s) => handleSliderChange(key, s)}
              />
            ))}
          </div>

          {/* <SimilarImageSearchBox ref={searchRef} onSearch={handleSearch} /> */}

        </Panel>
      </Collapse>

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
              {/* 新增只看已选切换开关 */}
              <Switch
                checked={showOnlySelected}
                onChange={setShowOnlySelected}
                checkedChildren="只看选中"
                unCheckedChildren="全部图片"
              />
            </Space>
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

        <ImageGallery
          images={displayedImages}
          selectedIds={selectedImageIds}
          onSelectedIdsChange={(newIds) => {
            // 这里同步ImageGrid内选中状态
            setSelectedImageIds(newIds);
          }}
          onClickImage={onClickImage}
          onFindSimilar={handleFindSimilar}
          selectable={true}
          highlightEnabled={highlightEnabled}
        />
      </div>
    </div>
  );
}
