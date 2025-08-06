import React, { useState } from 'react';
import CollectionSelector from './components/CollectionSelector';
import ImageGrid from './components/ImageGrid';

export default function App() {
  const [collection, setCollection] = useState<'dataset' | 'favourite' | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelect = (type: 'dataset' | 'favourite', ids: string[]) => {
    setCollection(ids.length > 0 ? type : null);
    setSelectedIds(ids);
  };

  return (
    <div className="main-layout">
      <div className="side-panel">
        <CollectionSelector onSelect={handleSelect} />
      </div>
      <ImageGrid collection={collection} selectedIds={selectedIds} />
    </div>
  );
}
