import React, { useState } from 'react';

type Props = {
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  totalPages: number;
};

export default function Navbar({
  page,
  setPage,
  pageSize,
  setPageSize,
  totalPages
}: Props) {
  const [gotoPage, setGotoPage] = useState(page + 1);

  const handleGoto = () => {
    const target = Math.min(Math.max(gotoPage - 1, 0), totalPages - 1);
    setPage(target);
  };

  return (
    <div id="nav-bar">
      <button onClick={() => setPage(Math.max(page - 1, 0))} disabled={page === 0}>
        上一页
      </button>
      <label>跳转到第</label>
      <input
        type="number"
        value={gotoPage}
        onChange={(e) => setGotoPage(Number(e.target.value))}
        onKeyDown={(e) => e.key === 'Enter' && handleGoto()}
        min={1}
      />
      <label>页</label>
      <span> / 共 {totalPages} 页</span>

      <label>每页显示</label>
      <select
        value={pageSize}
        onChange={(e) => {
          setPageSize(Number(e.target.value));
          setPage(0);
        }}
      >
        {[10, 20, 30, 50, 100].map((val) => (
          <option key={val} value={val}>{val}</option>
        ))}
      </select>
      <label>张图片</label>

      <button
        onClick={() => setPage(Math.min(page + 1, totalPages - 1))}
        disabled={page + 1 >= totalPages}
      >
        下一页
      </button>
    </div>
  );
}
