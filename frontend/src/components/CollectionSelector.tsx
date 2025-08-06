import React, { useEffect, useState } from 'react';
import TreeSelector, { TreeItem } from './TreeSelector';
//import { mockDatasetTree, mockFavourites } from './mockData';

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
    fetch(`${baseUrl}/api/datasets/tree`)
      .then(res => res.json())
      .then(setDatasetTree)
      //.catch(() => setDatasetTree(mockDatasetTree));

    fetch(`${baseUrl}/api/favourites`)
      .then(res => res.json())
      .then(data => setFavouriteTree(data))
      //.catch(() => setFavouriteTree(mockFavourites));
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
    <div className="tree-panel">
      <div style={{ display: 'flex', marginBottom: 12, gap: 12 }}>
        <button
          onClick={() => setActiveTab('dataset')}
          style={{
            flex: 1,
            padding: 8,
            fontWeight: activeTab === 'dataset' ? 'bold' : 'normal',
            background: activeTab === 'dataset' ? '#eee' : 'transparent',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          数据集
        </button>
        <button
          onClick={() => setActiveTab('favourite')}
          style={{
            flex: 1,
            padding: 8,
            fontWeight: activeTab === 'favourite' ? 'bold' : 'normal',
            background: activeTab === 'favourite' ? '#eee' : 'transparent',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          收藏夹
        </button>
      </div>

      {activeTab === 'dataset' ? (
        <TreeSelector
          items={datasetTree}
          selected={selectedDataset}
          onSelect={handleSelect('dataset')}
          search={search}
          setSearch={setSearch}
          allowSearch={true}
        />
      ) : (
        <TreeSelector
          items={favouriteTree}
          selected={selectedFavourite}
          onSelect={handleSelect('favourite')}
          search={search}
          setSearch={setSearch}
          allowSearch={true}
        />
      )}
    </div>
  );
}
