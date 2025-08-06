import React, { useState } from 'react';
import CollectionSelector from './components/CollectionSelector';
import ImageGrid from './components/ImageGrid';
import ImageDetails from './components/ImageDetails';
import { ImageInfo } from './components/ImageGrid';

export default function App() {
  const [collection, setCollection] = useState<'dataset' | 'favourite' | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null);

  const handleSelect = (type: 'dataset' | 'favourite', ids: string[]) => {
    setCollection(ids.length > 0 ? type : null);
    setSelectedIds(ids);
  };

  return (
  <div className="page-container">
    <div className="left-sidebar">
        <CollectionSelector onSelect={handleSelect} />
    </div>

    <div className="main-content">
      <ImageGrid collection={collection} selectedIds={selectedIds} onSelectImage={setSelectedImage}/>
    </div>

    <div className="right-sidebar">
      <ImageDetails image={selectedImage} />
    </div>
  </div>
  );
}
