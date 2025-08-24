// CollectionSelector.tsx
import React, { useEffect, useState } from 'react';
import TreeSelector, { TreeItem } from './TreeSelector';
import { Tabs } from 'antd';
import { getDatasetTreeApiDatasetsTreeGet } from '../client/sdk.gen';

type Props = {
  onSelect: (collection: 'dataset' | 'favourite', ids: string[]) => void;
};

export default function CollectionSelector({ onSelect }: Props) {
  const [datasetTree, setDatasetTree] = useState<TreeItem[]>([]);
  const [favouriteTree, setFavouriteTree] = useState<TreeItem[]>([]);
  const [activeTab, setActiveTab] = useState<'dataset' | 'favourite'>('dataset');

  // 每个 tab 独立的 selected 与 search
  const [selectedDataset, setSelectedDataset] = useState<string[]>([]);
  const [selectedFavourite, setSelectedFavourite] = useState<string[]>([]);
  const [searchDataset, setSearchDataset] = useState('');
  const [searchFavourite, setSearchFavourite] = useState('');

  // 请求数据集树
  useEffect(() => {
    (async () => {
      const { data, error } = await getDatasetTreeApiDatasetsTreeGet();
      if (error) {
        console.error(error);
        return;
      }
      setDatasetTree(data!);
    })();
  }, []);

  const handleSelect = (collection: 'dataset' | 'favourite') => (ids: string[]) => {
    if (collection === 'dataset') {
      setSelectedDataset(ids);
    } else {
      setSelectedFavourite(ids);
    }
    onSelect(collection, ids);
  };

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={key => setActiveTab(key as 'dataset' | 'favourite')}
        items={[
          {
            key: 'dataset',
            label: '数据集',
            children: (
              <TreeSelector
                items={datasetTree}
                selected={selectedDataset}
                onSelect={handleSelect('dataset')}
                search={searchDataset}
                setSearch={setSearchDataset}
                allowSearch
              />
            ),
          },
          {
            key: 'favourite',
            label: '收藏夹',
            children: (
              <TreeSelector
                items={favouriteTree}
                selected={selectedFavourite}
                onSelect={handleSelect('favourite')}
                search={searchFavourite}
                setSearch={setSearchFavourite}
                allowSearch
              />
            ),
          },
        ]}
      />
    </div>
  );
}
