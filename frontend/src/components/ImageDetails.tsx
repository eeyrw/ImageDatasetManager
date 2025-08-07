
import React from 'react';
// ImageInfo 类型可用 any 或由外部传入
import { Tag } from 'antd';

export type FieldConfig = {
  key: string;
  type: 'image' | 'text' | 'number' | 'tags';
  label: string;
  render?: (value: any, data: any) => React.ReactNode;
};

// 不再在组件内部定义字段，全部由外部传入

export default function ImageDetails({ data, fields }: { data: any | null, fields: FieldConfig[] }) {
  if (!data) return <div className="side-panel">点击图片查看详情</div>;

  return (
    <div>
      {fields.map(field => {
        const value = data[field.key];
        if (field.render) {
          return <div key={field.key}>{field.render(value, data)}</div>;
        }
        switch (field.type) {
          case 'image':
            return (
              <div key={field.key} style={{ marginBottom: 8 }}>
                <img src={value} alt={field.label} style={{ width: '100%' }} />
              </div>
            );
          case 'tags':
            return (
              <div key={field.key} style={{ marginBottom: 8 }}>
                <strong>{field.label}:</strong> {Array.isArray(value) && value.length > 0 ? value.map((tag: string) => <Tag key={tag}>{tag}</Tag>) : '无'}
              </div>
            );
          default:
            return (
              <div key={field.key} style={{ marginBottom: 8 }}>
                <strong>{field.label}:</strong> {value}
              </div>
            );
        }
      })}
    </div>
  );
}