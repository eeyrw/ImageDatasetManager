import React, { useEffect, useState } from 'react';



type Item = {
  id: string;
  name: string;
  children?: Item[];
};

export const mockDatasetTree: Item[] = [
  {
    id: 'a1f2-1111-aaaa-bbbb-0001',
    name: '自然场景',
    children: [
      {
        id: 'a1f2-1111-aaaa-bbbb-0002',
        name: '山脉',
        children: [
          { id: 'a1f2-1111-aaaa-bbbb-0003', name: '阿尔卑斯山' },
          { id: 'a1f2-1111-aaaa-bbbb-0004', name: '喜马拉雅山' },
        ],
      },
      {
        id: 'a1f2-1111-aaaa-bbbb-0005',
        name: '海洋',
        children: [
          { id: 'a1f2-1111-aaaa-bbbb-0006', name: '珊瑚礁' },
          { id: 'a1f2-1111-aaaa-bbbb-0007', name: '深海' },
        ],
      },
    ],
  },
  {
    id: 'a1f2-1111-aaaa-bbbb-0008',
    name: '城市风光',
    children: [
      {
        id: 'a1f2-1111-aaaa-bbbb-0009',
        name: '夜景',
        children: [
          { id: 'a1f2-1111-aaaa-bbbb-0010', name: '东京' },
          { id: 'a1f2-1111-aaaa-bbbb-0011', name: '纽约' },
        ],
      },
      { id: 'a1f2-1111-aaaa-bbbb-0012', name: '建筑物' },
    ],
  },
];

export const mockFavourites: Item[] = [
  { id: 'fav-0001-uuid', name: '最爱的猫猫' },
  { id: 'fav-0002-uuid', name: '色彩构图优秀' },
  { id: 'fav-0003-uuid', name: '审美分高于0.9' },
  { id: 'fav-0004-uuid', name: '需要标注的人脸数据' },
  { id: 'fav-0005-uuid', name: '准备训练LoRA' },
];


type Props = {
  onSelect: (collection: 'dataset' | 'favourite', ids: string[]) => void;
};

const baseUrl = import.meta.env.VITE_API_BASE_URL;

export default function CollectionSelector({ onSelect }: Props) {
  const [datasetTree, setDatasetTree] = useState<Item[]>([]);
  const [favourites, setFavourites] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'dataset' | 'favourite'>('dataset');

  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [selectedFavouriteIds, setSelectedFavouriteIds] = useState<string[]>([]);

  

  useEffect(() => {
    // 模拟接口加载
    fetch(`${baseUrl}/api/datasets/tree`)
      .then(res => res.json())
      .then(setDatasetTree)
      .catch(() => setDatasetTree(mockDatasetTree));

    fetch(`${baseUrl}/api/favourites`)
      .then(res => res.json())
      .then(setFavourites)
      .catch(() => setFavourites(mockFavourites));
  }, []);

  const toggleSelect = (collection: 'dataset' | 'favourite', id: string) => {
    if (collection === 'dataset') {
      const newSelected = selectedDatasetIds.includes(id)
        ? selectedDatasetIds.filter(x => x !== id)
        : [...selectedDatasetIds, id];
      setSelectedDatasetIds(newSelected);
      onSelect('dataset', newSelected);
    } else {
      const newSelected = selectedFavouriteIds.includes(id)
        ? selectedFavouriteIds.filter(x => x !== id)
        : [...selectedFavouriteIds, id];
      setSelectedFavouriteIds(newSelected);
      onSelect('favourite', newSelected);
    }
  };

  const renderTreeNode = (node: Item, depth = 0): React.ReactNode => {
    if (search && !node.name.toLowerCase().includes(search.toLowerCase())) {
      if (!node.children?.length) return null;
      const filteredChildren = node.children
        .map(child => renderTreeNode(child, depth + 1))
        .filter(Boolean);
      if (filteredChildren.length === 0) return null;
      return (
        <div key={node.id} style={{ marginLeft: depth * 12 }}>
          <div className="tree-node folder">{node.name}</div>
          {filteredChildren}
        </div>
      );
    }

    return (
      <div key={node.id} style={{ marginLeft: depth * 12 }}>
        <label className="tree-node">
          <input
            type="checkbox"
            checked={selectedDatasetIds.includes(node.id)}
            onChange={() => toggleSelect('dataset', node.id)}
          />{' '}
          {node.name}
        </label>
        {node.children?.map(child => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="tree-panel">
      <div style={{ display: 'flex', marginBottom: 12, gap: 12 }}>
        <button
          style={{
            flex: 1,
            padding: 8,
            fontWeight: activeTab === 'dataset' ? 'bold' : 'normal',
            background: activeTab === 'dataset' ? '#eee' : 'transparent',
            borderRadius: 6,
            cursor: 'pointer',
          }}
          onClick={() => setActiveTab('dataset')}
        >
          数据集
        </button>
        <button
          style={{
            flex: 1,
            padding: 8,
            fontWeight: activeTab === 'favourite' ? 'bold' : 'normal',
            background: activeTab === 'favourite' ? '#eee' : 'transparent',
            borderRadius: 6,
            cursor: 'pointer',
          }}
          onClick={() => setActiveTab('favourite')}
        >
          收藏夹
        </button>
      </div>

      {activeTab === 'dataset' && (
        <input
          type="text"
          placeholder="搜索数据集..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="tree-search"
        />
      )}

      {activeTab === 'dataset' ? (
        datasetTree.length === 0 ? (
          <div>加载中...</div>
        ) : (
          datasetTree.map((node) => renderTreeNode(node))
        )
      ) : favourites.length === 0 ? (
        <div>收藏夹为空</div>
      ) : (
        favourites.map(({ id, name }) => (
          <label key={id} className="tree-node">
            <input
              type="checkbox"
              checked={selectedFavouriteIds.includes(id)}
              onChange={() => toggleSelect('favourite', id)}
            />{' '}
            {name}
          </label>
        ))
      )}
    </div>
  );
}
