// src/App.tsx
import React, { useState } from 'react';
import Navbar from './components/Navbar';
import ImageGrid from './components/ImageGrid';

export default function App() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  return (
    <>
      <Navbar
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />
      <ImageGrid page={page} pageSize={pageSize} />
    </>
  );
}
