import React, { useEffect, useState } from 'react';
import TreeSelector, { TreeItem } from './TreeSelector';
import { Tabs } from 'antd';
import { createClient } from '../client/client';
import { client } from '../client/client.gen';
import { DatasetTreeSchema } from '../client/schemas.gen';
import { getDatasetTreeApiDatasetsTreeGet } from '../client/sdk.gen';
import type { DatasetTree } from '../client/types.gen';


type Props = {
  onSelect: (collection: 'dataset' | 'favourite', ids: string[]) => void;
};

const baseUrl = import.meta.env.VITE_API_BASE_URL;

export default function CollectionSelector({ onSelect }: Props) {
  const [datasetTree, setDatasetTree] = useState<TreeItem[]>([]);
  const [favouriteTree, setFavouriteTree] = useState<TreeItem[]>([]);
  const [activeTab, setActiveTab] = useState<'dataset' | 'favourite'>('dataset');
  const [selectedDataset, setSelectedDataset] = useState<string[]>([]);
  const [selectedFavourite, setSelectedFavourite] = useState<string[]>([]);
  const [search, setSearch] = useState('');

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
        items={[{
          key: 'dataset',
          label: '数据集',
          children: (
            <TreeSelector
              items={datasetTree}
              selected={selectedDataset}
              onSelect={handleSelect('dataset')}
              search={search}
              setSearch={setSearch}
              allowSearch={true}
            />
          )
        }, {
          key: 'favourite',
          label: '收藏夹',
          children: (
            <TreeSelector
              items={favouriteTree}
              selected={selectedFavourite}
              onSelect={handleSelect('favourite')}
              search={search}
              setSearch={setSearch}
              allowSearch={true}
            />
          )
        }]}
      />
    </div>
  );
}
