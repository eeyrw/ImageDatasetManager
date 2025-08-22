import React, { useState } from 'react';
import { Tag, Descriptions, Flex, Select, Input, Button, Space, Divider } from 'antd';
import isEqual from 'lodash/isEqual';

export type FieldConfig = {
  key: string;
  type: 'image' | 'text' | 'number' | 'tags' | 'texts' | 'size';
  label: string;
  editable?: boolean;
  render?: (value: any, data: any) => React.ReactNode;
};

export default function ImageDetails({
  data,
  fields,
  onSave,
  saving = false,
}: {
  data: any | null;
  fields: FieldConfig[];
  onSave?: (values: Record<string, any>) => void;
  saving?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [initialValues, setInitialValues] = useState<Record<string, any>>({});

  if (!data) return <div className="side-panel">点击图片查看详情</div>;

  const imageField = fields.find((f) => f.type === 'image');
  const imageValue = imageField ? data[imageField.key] : null;

  const startEditing = () => {
    if (saving) return;
    const initValues: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.editable) initValues[f.key] = data[f.key];
    });
    setEditValues(initValues);
    setInitialValues(initValues);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (saving) return;
    setIsEditing(false);
    setEditValues({});
    setInitialValues({});
  };

  const saveEditing = () => {
    if (saving) return;
    const changedValues: Record<string, any> = {};
    Object.keys(editValues).forEach((key) => {
      if (!isEqual(editValues[key], initialValues[key])) {
        changedValues[key] = editValues[key];
      }
    });
    onSave?.(changedValues);
    setIsEditing(false);
  };

  return (
    <div>
      {imageField && imageValue && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <img src={imageValue} alt={imageField.label} style={{ width: '100%', borderRadius: 6 }} />
        </div>
      )}

      {/* 顶部编辑按钮 */}
      <div style={{ marginBottom: 12, textAlign: 'right' }}>
        {isEditing ? (
          <Space>
            <Button type="primary" size="small" onClick={saveEditing} loading={saving}>
              保存
            </Button>
            <Button size="small" onClick={cancelEditing} disabled={saving}>
              取消
            </Button>
          </Space>
        ) : (
          <Button size="small" onClick={startEditing} disabled={saving}>
            编辑
          </Button>
        )}
      </div>

      <Descriptions column={1} layout="vertical" size="small" style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
        {fields
          .filter((field) => field.type !== 'image')
          .map((field) => {
            const value = data[field.key];
            let content: React.ReactNode = null;

            if (isEditing && field.editable) {
              if (field.type === 'tags') {
                content = (
                  <Select
                    mode="tags"
                    style={{ width: '100%' }}
                    value={editValues[field.key]}
                    open={false}
                    onChange={(val) => setEditValues((prev) => ({ ...prev, [field.key]: val }))}
                    placeholder="输入标签后回车"
                  />
                );
              } else if (field.type === 'texts') {
                const texts: string[] = editValues[field.key] || [];

                content = (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                    {texts.map((text, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 8 }}>
                        <Input.TextArea
                          value={text}
                          autoSize={{ minRows: 2, maxRows: 6 }}
                          onChange={(e) => {
                            const newTexts = [...texts];
                            newTexts[idx] = e.target.value;
                            setEditValues((prev) => ({ ...prev, [field.key]: newTexts }));
                          }}
                        />
                        <Button
                          type="link"
                          danger
                          onClick={() => {
                            const newTexts = texts.filter((_, i) => i !== idx);
                            setEditValues((prev) => ({ ...prev, [field.key]: newTexts }));
                          }}
                        >
                          删除
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="dashed"
                      onClick={() => {
                        const newTexts = [...texts, ''];
                        setEditValues((prev) => ({ ...prev, [field.key]: newTexts }));
                      }}
                    >
                      添加文本
                    </Button>
                  </div>
                );
              } else if (field.type === 'text') {
                content = (
                  <Input.TextArea
                    value={editValues[field.key]}
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                );
              } else {
                content = (
                  <Input
                    value={editValues[field.key]}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                );
              }
            } else {
              if (field.render) {
                content = field.render(value, data);
              } else {
                switch (field.type) {
                  case 'tags':
                    content = Array.isArray(value) ? (
                      <Flex wrap="wrap" gap="small">
                        {value.map((tag: string) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </Flex>
                    ) : null;
                    break;
                  case 'texts':
                    content = Array.isArray(value) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {value.map((line: string, idx: number) => (
                          <div key={idx} style={{ padding: '4px 0', borderBottom: idx < value.length - 1 ? '1px solid #eee' : 'none' }}>
                            {line}
                          </div>
                        ))}
                      </div>
                    ) : null;
                    break;
                  case 'size':
                    content = value?.w && value?.h ? `${value.w} × ${value.h}` : null;
                    break;
                  default:
                    content = value;
                }
              }
            }

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
