import React, { useState } from 'react';
import Navbar from './components/Navbar';
import ImageGrid from './components/ImageGrid';
import ImageDetails from './components/ImageDetails';
import DatasetTree from './components/DatasetTree';

export type ImageInfo = {
  url: string;
  width: number;
  height: number;
  tags: string[];
  caption: string;
};

export default function App() {
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);


  return (
    <>
        <main className="main-layout">
          <div className="tree-panel">
            <DatasetTree
              selected={selectedPaths}
              onSelect={setSelectedPaths}
            />
          </div>
          <ImageGrid selectedDatasets={selectedPaths} />
        </main>
    </>
  );
}
