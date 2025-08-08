import React, { useEffect, useState } from "react";
import {
    Form,
    Input,
    Button,
    Tag,
    InputNumber,
    Slider,
    Space,
    message,
    InputNumberProps,
    Row,
    Col,
} from "antd";

interface SchemaField {
    field: string;
    label: string;
    type: string;
    input: "text" | "editable-tags" | "range";
    min?: number;
    max?: number;
    operator?: string;
}

interface DynamicQueryFormProps {
    onSearch: (params: any) => void;
}

const mockSchema: SchemaField[] = [
    {
        field: "keyword",
        label: "关键词",
        type: "string",
        input: "text",
        operator: "ilike",
    },
    {
        field: "tags",
        label: "标签",
        type: "string[]",
        input: "editable-tags",
        operator: "in",
    },
    {
        field: "score",
        label: "评分",
        type: "number",
        input: "range",
        min: 0,
        max: 10,
        operator: "between",
    },
        {
        field: "score2",
        label: "评分2",
        type: "number",
        input: "range",
        min: 0,
        max: 10,
        operator: "between",
    },
];

const DecimalStep: React.FC = () => {
  const [inputValue, setInputValue] = useState(0);

  const onChange: InputNumberProps['onChange'] = (value) => {
    if (Number.isNaN(value)) {
      return;
    }
    setInputValue(value as number);
  };

  return (
    <Row>
      <Col span={12}>
        <Slider
          min={0}
          max={1}
          onChange={onChange}
          value={typeof inputValue === 'number' ? inputValue : 0}
          step={0.01}
        />
      </Col>
      <Col span={4}>
        <InputNumber
          min={0}
          max={1}
          style={{ margin: '0 16px' }}
          step={0.01}
          value={inputValue}
          onChange={onChange}
        />
      </Col>
    </Row>
  );
};

const IntegerStep: React.FC = () => {
  const [inputValue, setInputValue] = useState(1);

  const onChange: InputNumberProps['onChange'] = (newValue) => {
    setInputValue(newValue as number);
  };

  return (
    <Row>
      <Col span={12}>
        <Slider
          min={1}
          max={20}
          onChange={onChange}
          value={typeof inputValue === 'number' ? inputValue : 0}
        />
      </Col>
      <Col span={4}>
        <InputNumber
          min={1}
          max={20}
          style={{ margin: '0 16px' }}
          value={inputValue}
          onChange={onChange}
        />
      </Col>
    </Row>
  );
};


const DynamicQueryForm: React.FC<DynamicQueryFormProps> = ({ onSearch }) => {
    const [form] = Form.useForm();

    const [schema, setSchema] = useState<SchemaField[]>([]);

    const [rangeStates, setRangeStates] = useState<{
        [key: string]: { bounds: [number, number]; value: [number, number] };
    }>({});

    const [tagInputs, setTagInputs] = useState<{ [key: string]: string }>({});
    const [inputVisibles, setInputVisibles] = useState<{ [key: string]: boolean }>(
        {}
    );

    useEffect(() => {
        fetch("/api/query-schema")
            .then((res) => {
                if (!res.ok) throw new Error("网络错误");
                return res.json();
            })
            .then((data) => {
                setSchema(data);
            })
            .catch(() => {
                message.warning("加载schema失败，使用默认mock数据");
                setSchema(mockSchema);
            });
    }, []);

    useEffect(() => {
        const initialRanges: typeof rangeStates = {};
        schema.forEach((f) => {
            if (f.input === "range") {
                initialRanges[f.field] = {
                    bounds: [f.min ?? 0, f.max ?? 10],
                    value: [f.min ?? 0, f.max ?? 10],
                };
            }
        });
        setRangeStates(initialRanges);

        // 给数组类型字段设置默认空数组，避免 undefined 导致 map 报错
        const initialValues: any = {};
        schema.forEach((f) => {
            if (f.input === "editable-tags") {
                initialValues[f.field] = [];
            }
        });
        form.setFieldsValue(initialValues);
    }, [schema, form]);

    const onRangeBoundsChange = (field: string, newBounds: [number, number]) => {
        setRangeStates((prev) => {
            const oldValue = prev[field]?.value ?? newBounds;
            const newValue: [number, number] = [
                Math.max(oldValue[0], newBounds[0]),
                Math.min(oldValue[1], newBounds[1]),
            ];
            form.setFieldsValue({
                [field]: { bounds: newBounds, value: newValue },
            });
            return { ...prev, [field]: { bounds: newBounds, value: newValue } };
        });
    };

    const onRangeValueChange = (field: string, newValue: [number, number]) => {
        setRangeStates((prev) => {
            const bounds = prev[field]?.bounds ?? [0, 10];
            const safeValue: [number, number] = [
                Math.max(bounds[0], newValue[0]),
                Math.min(bounds[1], newValue[1]),
            ];
            form.setFieldsValue({
                [field]: { bounds, value: safeValue },
            });
            return { ...prev, [field]: { bounds, value: safeValue } };
        });
    };

    const showTagInput = (field: string) => {
        setInputVisibles((prev) => ({ ...prev, [field]: true }));
    };

    const handleTagInputChange = (
        field: string,
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const val = e.target.value;
        setTagInputs((prev) => ({ ...prev, [field]: val }));
    };

    const handleTagInputConfirm = (field: string) => {
        const inputVal = tagInputs[field]?.trim();
        if (!inputVal) {
            setInputVisibles((prev) => ({ ...prev, [field]: false }));
            return;
        }
        const oldTagsRaw: any = form.getFieldValue(field);
        const oldTags = Array.isArray(oldTagsRaw) ? oldTagsRaw : [];
        if (oldTags.includes(inputVal)) {
            message.info("标签已存在");
            return;
        }
        const newTags = [...oldTags, inputVal];
        form.setFieldsValue({ [field]: newTags });
        setInputVisibles((prev) => ({ ...prev, [field]: false }));
        setTagInputs((prev) => ({ ...prev, [field]: "" }));
    };

    const handleTagClose = (field: string, removedTag: string) => {
        const oldTagsRaw: any = form.getFieldValue(field);
        const oldTags = Array.isArray(oldTagsRaw) ? oldTagsRaw : [];
        const newTags = oldTags.filter((t) => t !== removedTag);
        form.setFieldsValue({ [field]: newTags });
    };

    const renderFormItem = (field: SchemaField) => {
        switch (field.input) {
            case "text":
                return <Input placeholder={`请输入${field.label}`} />;
            case "editable-tags": {
                const tagsRaw: any = form.getFieldValue(field.field);
                const tags: string[] = Array.isArray(tagsRaw) ? tagsRaw : [];

                return (
                    <>
                        {tags.map((tag) => (
                            <Tag
                                key={tag}
                                closable
                                onClose={() => handleTagClose(field.field, tag)}
                                style={{ userSelect: "none" }}
                            >
                                {tag}
                            </Tag>
                        ))}
                        {inputVisibles[field.field] ? (
                            <Input
                                size="small"
                                style={{ width: 100 }}
                                value={tagInputs[field.field]}
                                onChange={(e) => handleTagInputChange(field.field, e)}
                                onBlur={() => handleTagInputConfirm(field.field)}
                                onPressEnter={() => handleTagInputConfirm(field.field)}
                                autoFocus
                            />
                        ) : (
                            <Tag
                                onClick={() => showTagInput(field.field)}
                                style={{ borderStyle: "dashed", cursor: "pointer" }}
                            >
                                + 添加标签
                            </Tag>
                        )}
                    </>
                );
            }
            case "range": {
                const rangeState = rangeStates[field.field];
                if (!rangeState) return null;

                const { bounds, value } = rangeState;

                return (
                    <Space>
                        <InputNumber
                            min={field.min}
                            max={bounds[1]}
                            value={bounds[0]}
                            onChange={(val) =>
                                onRangeBoundsChange(field.field, [val ?? bounds[0], bounds[1]])
                            }
                            placeholder="滑块最小值"
                        />
                        <InputNumber
                            min={bounds[0]}
                            value={bounds[1]}
                            onChange={(val) =>
                                onRangeBoundsChange(field.field, [bounds[0], val ?? bounds[1]])
                            }
                            placeholder="滑块最大值"
                        />
                        <Slider
                            range
                            min={bounds[0]}
                            max={bounds[1]}
                            value={value}
                            onChange={(vals) =>
                                onRangeValueChange(field.field, vals as [number, number])
                            }
                            style={{ width: 200 }}
                        />
                    </Space>
                );
            }
            default:
                return <Input placeholder={`请输入${field.label}`} />;
        }
    };

    const onFinish = (values: any) => {
        const result: any = {};
        console.log(values);
        schema.forEach((field) => {
            if (field.input === "range") {
                const val = values[field.field];
                if (val) {
                    result[field.field] = {
                        minBound: val.bounds[0],
                        maxBound: val.bounds[1],
                        low: val.value[0],
                        high: val.value[1],
                    };
                }
            } else {
                result[field.field] = values[field.field];
            }
        });
        onSearch(result);
    };

    return (
        <Form
            form={form}
            layout="inline"
            onFinish={onFinish}
            initialValues={{}}
            style={{ marginBottom: 16 }}
        >
            <DecimalStep />
            {schema.map((field) => (
                <Form.Item
                    name={field.field}
                    key={field.field}
                    label={field.label}
                    style={{ marginBottom: 12 }}
                >
                    {renderFormItem(field)}
                </Form.Item>
            ))}
            <Form.Item>
                <Button type="primary" htmlType="submit">
                    查询
                </Button>
            </Form.Item>
        </Form>
    );
};

export default DynamicQueryForm;
