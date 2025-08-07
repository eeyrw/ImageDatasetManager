import React, { useMemo, useState } from 'react';
import { Button, Input, Tree, Space, Card } from 'antd';

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
  // 工具函数：TreeItem[] 转换为 antd Tree 的数据结构
  const toAntdTreeData = (nodes: TreeItem[]): any[] =>
    nodes.map(item => ({
      key: item.id,
      title: item.name,
      children: item.children ? toAntdTreeData(item.children) : undefined,
    }));

  // 过滤树
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

  // 全选/反选/清空
  const collectAllIds = (nodes: TreeItem[]): string[] =>
    nodes.flatMap(item => [item.id, ...(item.children ? collectAllIds(item.children) : [])]);

  const handleSelectAll = () => {
    const allIds = collectAllIds(filteredItems);
    onSelect(Array.from(new Set([...selected, ...allIds])));
  };
  const handleClearAll = () => onSelect([]);
  const handleInvertSelection = () => {
    const allIds = collectAllIds(filteredItems);
    const newSelected = [
      ...selected.filter(id => !allIds.includes(id)),
      ...allIds.filter(id => !selected.includes(id)),
    ];
    onSelect(newSelected);
  };

  // antd Tree 受控
  const treeData = useMemo(() => toAntdTreeData(filteredItems), [filteredItems]);
  // 递归收集所有 key 作为 expandedKeys
  const getAllKeys = (nodes: TreeItem[]): string[] =>
    nodes.flatMap(item => [item.id, ...(item.children ? getAllKeys(item.children) : [])]);
  const allKeys = useMemo(() => getAllKeys(filteredItems), [filteredItems]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>(allKeys);
  // 当过滤内容变化时自动展开所有
  React.useEffect(() => {
    setExpandedKeys(allKeys);
  }, [allKeys]);

  return (
    <Card bordered={false} bodyStyle={{ padding: 12 }} style={{ boxShadow: 'none', background: 'transparent' }}>
      {allowSearch && setSearch && (
        <Input.Search
          placeholder="搜索..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 8 }}
          enterButton={false}
        />
      )}
      <Space style={{ marginBottom: 8 }}>
        <Button size="small" onClick={handleSelectAll}>全选</Button>
        <Button size="small" onClick={handleInvertSelection}>反选</Button>
        <Button size="small" onClick={handleClearAll}>取消全选</Button>
      </Space>
      <Tree
        checkable
        treeData={treeData}
        checkedKeys={selected}
        onCheck={keys => onSelect(Array.isArray(keys) ? keys.map(String) : [])}
        expandedKeys={expandedKeys}
        onExpand={keys => setExpandedKeys(keys as string[])}
        style={{ background: 'transparent', padding: 8 }}
      />
    </Card>
  );
}
