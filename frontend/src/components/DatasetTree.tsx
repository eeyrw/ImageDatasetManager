import React, { useEffect, useState } from 'react';

type TreeNode = {
  name: string;
  path: string;
  children?: TreeNode[];
};

type Props = {
  selected: string[];
  onSelect: (paths: string[]) => void;
};

// mock fallback 数据
const mockTree: TreeNode[] = [
  {
    name: 'user1',
    path: 'user1',
    children: [
      {
        name: '2023',
        path: 'user1/2023',
        children: [
          {
            name: 'spring',
            path: 'user1/2023/spring',
            children: [
              { name: 'set-01', path: 'user1/2023/spring/set-01' },
              { name: 'set-02', path: 'user1/2023/spring/set-02' }
            ]
          },
          {
            name: 'summer',
            path: 'user1/2023/summer',
            children: [
              { name: 'set-03', path: 'user1/2023/summer/set-03' }
            ]
          }
        ]
      },
      {
        name: '2024',
        path: 'user1/2024',
        children: [
          {
            name: 'autumn',
            path: 'user1/2024/autumn',
            children: [
              { name: 'set-04', path: 'user1/2024/autumn/set-04' },
              { name: 'set-05', path: 'user1/2024/autumn/set-05' }
            ]
          }
        ]
      }
    ]
  },
  {
    name: 'sceneA',
    path: 'sceneA',
    children: [
      {
        name: 'indoor',
        path: 'sceneA/indoor',
        children: [
          {
            name: 'v1.0',
            path: 'sceneA/indoor/v1.0',
            children: [
              { name: 'cam1', path: 'sceneA/indoor/v1.0/cam1' },
              { name: 'cam2', path: 'sceneA/indoor/v1.0/cam2' }
            ]
          },
          {
            name: 'v2.0',
            path: 'sceneA/indoor/v2.0'
          }
        ]
      },
      {
        name: 'outdoor',
        path: 'sceneA/outdoor',
        children: [
          { name: 'v1.1', path: 'sceneA/outdoor/v1.1' }
        ]
      }
    ]
  },
  {
    name: 'datasetX',
    path: 'datasetX',
    children: [
      {
        name: 'raw',
        path: 'datasetX/raw',
        children: [
          { name: 'imgs', path: 'datasetX/raw/imgs' },
          { name: 'annotations', path: 'datasetX/raw/annotations' }
        ]
      },
      {
        name: 'processed',
        path: 'datasetX/processed',
        children: [
          { name: 'tfrecord', path: 'datasetX/processed/tfrecord' }
        ]
      }
    ]
  }
];


export default function DatasetTree({ selected, onSelect }: Props) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [search, setSearch] = useState('');

  // 替换 fetch 失败后的 fallback
  useEffect(() => {
    fetch('/api/datasets/tree')
      .then((res) => {
        if (!res.ok) throw new Error('fetch failed');
        return res.json();
      })
      .then(setTree)
      .catch(() => {
        // 使用复杂 mock 数据
        setTree(mockTree);
      });
  }, []);


  const togglePath = (path: string) => {
    if (selected.includes(path)) {
      onSelect(selected.filter((p) => p !== path));
    } else {
      onSelect([...selected, path]);
    }
  };

  const renderNode = (node: TreeNode, depth = 0) => {
    if (search && !node.name.toLowerCase().includes(search.toLowerCase())) {
      if (!node.children || node.children.length === 0) return null;
      const filteredChildren = node.children
        .map((child) => renderNode(child, depth + 1))
        .filter(Boolean);
      if (filteredChildren.length === 0) return null;
      return (
        <div key={node.path} style={{ marginLeft: depth * 12 }}>
          <div className="tree-node folder">{node.name}</div>
          {filteredChildren}
        </div>
      );
    }

    return (
      <div key={node.path} style={{ marginLeft: depth * 12 }}>
        <label className="tree-node">
          <input
            type="checkbox"
            checked={selected.includes(node.path)}
            onChange={() => togglePath(node.path)}
          />{' '}
          {node.name}
        </label>
        {node.children?.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="tree-panel">
      <input
        type="text"
        placeholder="搜索数据集..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="tree-search"
      />
      {tree.map((n) => renderNode(n))}
    </div>
  );
}
