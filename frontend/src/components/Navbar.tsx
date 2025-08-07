import React from 'react';
import { Pagination, Select, Typography, Space } from 'antd';
const { Text } = Typography;

type Props = {
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  totalPages: number;
  totalItems: number;
};

export default function Navbar({
  page,
  setPage,
  pageSize,
  setPageSize,
  totalPages,
  totalItems
}: Props) {
  return (
    <div id="nav-bar" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
      <Space wrap align="center">
        <Pagination
          current={page + 1}
          pageSize={pageSize}
          total={totalItems}
          showSizeChanger
          pageSizeOptions={[10, 20, 30, 50, 100].map(String)}
          onChange={(p, s) => {
            setPage(p - 1);
            if (s !== pageSize) {
              setPageSize(s);
              setPage(0);
            }
          }}
          showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条 / 共 ${total} 张图片`}
        />
      </Space>
    </div>
  );
}
