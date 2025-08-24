import React, { useEffect, useState } from 'react';
import { Tag, Descriptions, Flex, Select, Input, Button, message, Progress, Space } from 'antd';
import { EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import isEqual from 'lodash/isEqual';
import NumberWithDistribution from './NumberWithDistribution';

export type FieldConfig = {
  key: string;
  type: 'image' | 'text' | 'number' | 'hist' | 'prob' | 'tags' | 'texts' | 'size';
  label: string;
  editable?: boolean;
  render?: (value: any, data: any) => React.ReactNode;
};

export default function ImageDetails({
  data,
  fields,
  onSave
}: {
  data: any | null;
  fields: FieldConfig[];
  onSave?: (imgId: string, values: Record<string, any>) => Promise<void>;
}) {
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [editingFields, setEditingFields] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [internalData, setInternalData] = useState(data);

  useEffect(() => {
    setInternalData(data);
    setEditValues({});
    setEditingFields({});
  }, [data]);

  if (!internalData) return <div className="side-panel">点击图片查看详情</div>;

  const imageField = fields.find((f) => f.type === 'image');
  const imageValue = imageField ? internalData?.[imageField.key] : null;

  const startFieldEditing = (key: string) => {
    setEditValues((prev) => ({ ...prev, [key]: internalData[key] }));
    setEditingFields((prev) => ({ ...prev, [key]: true }));
  };

  const cancelFieldEditing = (key: string) => {
    setEditingFields((prev) => ({ ...prev, [key]: false }));
    setEditValues((prev) => ({ ...prev, [key]: undefined }));
  };

  const saveFieldEditing = async (key: string) => {
    if (saving) return;

    if (isEqual(editValues[key], internalData[key])) {
      message.info('没有修改内容');
      setEditingFields((prev) => ({ ...prev, [key]: false }));
      return;
    }

    try {
      setSaving(true);
      await onSave?.(internalData.id, { [key]: editValues[key] });
      message.success('保存成功');
      setEditingFields((prev) => ({ ...prev, [key]: false }));
      setInternalData((prev) => ({ ...prev, [key]: editValues[key] }));
    } catch (err) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {imageField && imageValue && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <img
            src={imageValue}
            alt={imageField.label}
            style={{
              maxWidth: '100%',   // 父容器宽度不足时缩小
              width: 'auto',      // 否则保持原始宽度
              borderRadius: 6
            }}
          />
        </div>
      )}

      <Descriptions
        column={1}
        layout="vertical"
        size="small"
        style={{ background: '#fff', padding: 16, borderRadius: 8 }}
      >
        {fields
          .filter((field) => field.type !== 'image')
          .map((field) => {
            const value = internalData[field.key];
            const isFieldEditing = editingFields[field.key];
            let content: React.ReactNode = null;

            // ---------- 编辑模式 ----------
            if (isFieldEditing && field.editable) {
              switch (field.type) {
                case 'tags':
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
                  break;
                case 'texts':
                  const texts: string[] = editValues[field.key] || [];
                  content = (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: "100%" }}>
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
                            style={{ flex: 1 }}
                          />
                          <DeleteOutlined
                            style={{ cursor: 'pointer', color: 'red', fontSize: 18 }}
                            onClick={() => {
                              const newTexts = texts.filter((_, i) => i !== idx);
                              setEditValues((prev) => ({ ...prev, [field.key]: newTexts }));
                            }}
                          />
                        </div>
                      ))}
                      <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          const newTexts = [...texts, ''];
                          setEditValues((prev) => ({ ...prev, [field.key]: newTexts }));
                        }}
                      >
                        添加文本
                      </Button>
                    </div>
                  );
                  break;
                case 'text':
                  content = (
                    <Input.TextArea
                      value={editValues[field.key]}
                      autoSize={{ minRows: 2, maxRows: 6 }}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  );
                  break;
                default:
                  // number / other editable types
                  content = (
                    <Input
                      value={editValues[field.key]}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  );
              }
            } else {
              // ---------- 显示模式 ----------
              if (field.render) {
                content = field.render(value, internalData);
              } else {
                switch (field.type) {
                  case 'number':
                    content =
                      typeof value === 'number'
                        ? Number.isInteger(value)
                          ? value
                          : Number(value).toPrecision(3)
                        : value;
                    break;
                  case 'hist':
                    content =
                      <div style={{ width: '100%' }}>
                        <NumberWithDistribution
                          apiUrl={`http://localhost:8000/analyze_json?fields=${field.key}`}
                          value={typeof value === 'number' ? value.toPrecision(3) : value}
                          height={180}
                        />
                      </div>;
                    break;
                  case 'prob':
                    content = <Progress percent={(value * 100).toFixed(0)} size="small" />;
                    break;
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

            // ---------- 标题和右侧按钮 ----------
            const labelNode = field.editable ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{field.label}</span>

                {isFieldEditing ? (
                  <Space>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => saveFieldEditing(field.key)}
                      loading={saving}
                    >
                      保存
                    </Button>
                    <Button
                      size="small"
                      onClick={() => cancelFieldEditing(field.key)}
                      disabled={saving}
                    >
                      取消
                    </Button>
                  </Space>
                ) : (
                  <EditOutlined
                    style={{ cursor: 'pointer' }}
                    onClick={() => startFieldEditing(field.key)}
                  />
                )}
              </div>
            ) : field.label;

            return <Descriptions.Item key={field.key} label={labelNode}>{content}</Descriptions.Item>;
          })}
      </Descriptions>
    </div>
  );
}
