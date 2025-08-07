
import React from 'react';
import { Tag, Descriptions } from 'antd';

export type FieldConfig = {
  key: string;
  type: 'image' | 'text' | 'number' | 'tags';
  label: string;
  render?: (value: any, data: any) => React.ReactNode;
};

// 不再在组件内部定义字段，全部由外部传入

export default function ImageDetails({ data, fields }: { data: any | null, fields: FieldConfig[] }) {
  if (!data) return <div className="side-panel">点击图片查看详情</div>;

  // 单独渲染图片字段
  const imageField = fields.find(f => f.type === 'image');
  const imageValue = imageField ? data[imageField.key] : null;

  return (
    <div>
      {imageField && imageValue && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <img
            src={imageValue}
            alt={imageField.label}
            style={{ maxWidth: 320, maxHeight: 320, objectFit: 'contain', borderRadius: 6, boxShadow: '0 2px 8px #eee' }}
          />
        </div>
      )}
      <Descriptions
        column={1}
        size="middle"
        style={{ background: '#fff', padding: 16, borderRadius: 8 }}
      >
        {fields.filter(field => field.type !== 'image').map((field: FieldConfig) => {
          const value = data[field.key];
          let content: React.ReactNode = null;
          let shouldShow = true;
          if (field.render) {
            content = field.render(value, data);
            shouldShow = content !== undefined && content !== null && content !== '';
          } else {
            switch (field.type) {
              case 'tags':
                shouldShow = Array.isArray(value) && value.length > 0;
                content = shouldShow ? value.map((tag: string) => <Tag key={tag}>{tag}</Tag>) : null;
                break;
              default:
                shouldShow = value !== undefined && value !== null && value !== '';
                content = shouldShow ? value : null;
            }
          }
          if (!shouldShow) return null;
          return (
            <Descriptions.Item label={field.label} key={field.key}>
              {content}
            </Descriptions.Item>
          );
        })}
      </Descriptions>
    </div>
  );
}