import React, { useMemo } from 'react';

export type TreeItem = {
  id: string;
  name: string;
  children?: TreeItem[];
};

type Props = {
  items: TreeItem[];
  selected: string[];
  onSelect: (ids: string[]) => void;
  search?: string;
  setSearch?: (s: string) => void;
  allowSearch?: boolean;
};

export default function TreeSelector({ items, selected, onSelect, search = '', setSearch, allowSearch = true }: Props) {
  // 工具函数：获取节点及所有子孙的id
  const collectIds = (item: TreeItem): string[] => {
    return [item.id, ...(item.children?.flatMap(collectIds) || [])];
  };

  const isSelected = (id: string) => selected.includes(id);

  const toggle = (item: TreeItem) => {
    const ids = collectIds(item);
    const allSelected = ids.every(id => selected.includes(id));
    if (allSelected) {
      onSelect(selected.filter(id => !ids.includes(id)));
    } else {
      onSelect([...new Set([...selected, ...ids])]);
    }
  };

  const handleSelectAll = () => {
    const allIds = items.flatMap(collectIds);
    onSelect([...new Set([...selected, ...allIds])]);
  };

  const handleClearAll = () => {
    onSelect([]);
  };

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const filterTree = (node: TreeItem): TreeItem | null => {
      const nameMatch = node.name.toLowerCase().includes(search.toLowerCase());
      const matchedChildren = node.children
        ?.map(filterTree)
        .filter((c): c is TreeItem => c !== null);
      if (nameMatch || (matchedChildren && matchedChildren.length > 0)) {
        return { ...node, children: matchedChildren };
      }
      return null;
    };
    return items.map(filterTree).filter((x): x is TreeItem => x !== null);
  }, [items, search]);

  const renderNode = (item: TreeItem, depth = 0) => (
    <div key={item.id} style={{ marginLeft: depth * 12 }}>
      <label className="tree-node">
        <input
          type="checkbox"
          checked={isSelected(item.id)}
          onChange={() => toggle(item)}
        />{' '}
        {item.name}
      </label>
      {item.children?.map(child => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <div>
      {allowSearch && setSearch && (
        <input
          type="text"
          className="tree-search"
          placeholder="搜索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      <div style={{ marginBottom: 8 }}>
        <button onClick={handleSelectAll} style={{ marginRight: 8 }}>全选</button>
        <button onClick={handleClearAll}>取消全选</button>
      </div>

      {filteredItems.map(item => renderNode(item))}
    </div>
  );
}
