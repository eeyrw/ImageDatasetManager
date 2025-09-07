import React from "react";
import { Input, Image, Button, Upload, Popover } from "antd";
import { SearchOutlined, CloseCircleOutlined, UploadOutlined } from "@ant-design/icons";

export type RefImageInfo = {
  url: string;
  embedding?: number[];
};

type Props = {
  query: string;
  onQueryChange: (val: string) => void;
  refImage: RefImageInfo | null;
  onRefImageChange: (info: RefImageInfo | null) => void;
  onSearch: (query: string, refImage: RefImageInfo | null) => void;
};

const UnifiedSearchBox: React.FC<Props> = ({
  query,
  onQueryChange,
  refImage,
  onRefImageChange,
  onSearch,
}) => {
  const handleUpload = (file: any) => {
    const url = URL.createObjectURL(file);
    onRefImageChange({ url });
    return false;
  };

  return (
    <Input
      value={query}
      onChange={(e) => onQueryChange(e.target.value)}
      onPressEnter={() => onSearch(query, refImage)}
      placeholder="输入关键词，或选择参考图片"
      prefix={
        refImage ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Popover
        content={
            <div style={{ width: 250, maxHeight: 250, overflow: "hidden", borderRadius: 4 }}>
            <Image
                src={refImage.url}
                width="100%"
                height="100%"
                style={{ objectFit: "contain" }}
                preview={false}
            />
            </div>
        }
        placement="bottomLeft"
        trigger="hover"
        mouseEnterDelay={0.1}
        mouseLeaveDelay={0.1}
        getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
        >
        <Image
            src={refImage.url}
            width={28}
            height={28}
            style={{ objectFit: "cover", borderRadius: 4, cursor: "pointer" }}
            preview={false}
        />
        </Popover>
            <Button
              type="text"
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => onRefImageChange(null)}
            />
          </div>
        ) : (
          <Upload beforeUpload={handleUpload} showUploadList={false}>
            <Button type="text" size="small" icon={<UploadOutlined />} />
          </Upload>
        )
      }
      suffix={
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={() => onSearch(query, refImage)}
        >
          搜索
        </Button>
      }
    />
  );
};

export default UnifiedSearchBox;
