import React, { useEffect, useState } from "react";
import { Form, Button, message } from "antd";
import {
  QueryBuilderAntD
} from "@react-querybuilder/antd";
import { type Field, QueryBuilder, type RuleGroupType } from 'react-querybuilder';
import 'react-querybuilder/dist/query-builder.css';


interface DynamicQueryFormProps {
  onSearch: (params: any) => void;
}
const mockFields: Field[] = [
  {
    name: "keyword",
    label: "关键词",
    valueEditorType: "text",
    inputType: "text",
    operators: [{ name: "ilike", label: "包含" }],
  },
  {
    name: "tags",
    label: "标签",
    valueEditorType: "text",
    operators: [{ name: "in", label: "属于" }],
  },
  {
    name: "score",
    label: "评分",
    inputType: "number",
    operators: [{ name: "between", label: "介于" }],
  },
  {
    name: "score2",
    label: "评分2",
    inputType: "number",
    operators: [{ name: "between", label: "介于" }],
  },
];
const DynamicQueryForm: React.FC<DynamicQueryFormProps> = ({ onSearch }) => {
  const [fields, setFields] = useState<Field[]>([]);
  const [query, setQuery] = useState<RuleGroupType>({
    combinator: 'and', rules: []
  });

  useEffect(() => {
    fetch("/api/query-schema") // 直接返回符合 React Query Builder fields 格式的数据
      .then((res) => {
        if (!res.ok) throw new Error("网络错误");
        return res.json();
      })
      .then((data) => {
        setFields(data);
      })
      .catch(() => {
        setFields(mockFields);
        message.warning("加载 schema 失败，使用默认 mock 数据");
      });

  }, []);

  return (
    <Form layout="vertical">
      <Form.Item label="构建查询">
        <QueryBuilderAntD>
          <QueryBuilder fields={fields} query={query} onQueryChange={setQuery} />
        </QueryBuilderAntD>
      </Form.Item>
      <Form.Item>
        <Button type="primary" onClick={() => onSearch(query)}>
          查询
        </Button>
      </Form.Item>
    </Form>
  );
};

export default DynamicQueryForm;
