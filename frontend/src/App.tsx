import React, { useState } from 'react';
import Navbar from './components/Navbar';
import ImageGrid from './components/ImageGrid';
import ImageDetails from './components/ImageDetails';

export type ImageInfo = {
  url: string;
  width: number;
  height: number;
  tags: string[];
  caption: string;
};

export default function App() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null);

  return (
    <>
      <Navbar
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />
      <div className="main-layout">
        <ImageGrid page={page} pageSize={pageSize} onSelectImage={setSelectedImage} />
        <ImageDetails image={selectedImage} />
      </div>
    </>
  );
}