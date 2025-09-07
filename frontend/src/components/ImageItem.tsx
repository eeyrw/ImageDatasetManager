import React, { useState } from "react";
import { Checkbox, Rate, Button, Tooltip } from "antd";
import { SearchOutlined } from "@ant-design/icons";

type Props = {
  src: string;
  checked?: boolean;
  onCheckedChange?: (val: boolean) => void;
  onClick?: () => void;
  highlighted?: boolean;
  selectable?: boolean;
  rating?: number | null;
  onRatingChange?: (val: number) => void;
  onFindSimilar?: () => void;   // 新增：点击“找相似图”时触发
};

const ImageItem = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      src,
      checked = false,
      onCheckedChange,
      onClick,
      highlighted = true,
      selectable = true,
      rating = null,
      onRatingChange,
      onFindSimilar,
    },
    ref
  ) => {
    const [hoverValue, setHoverValue] = useState<number | null>(null);

    return (
      <div
        className={`image-item ${highlighted ? "" : "dimmed"}`}
        ref={ref}
        style={{ position: "relative" }}
      >
        {selectable && (
          <Checkbox
            checked={checked}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            className="image-checkbox"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        <img
          src={src}
          loading="lazy"
          alt=""
          onClick={onClick}
          style={{ cursor: "zoom-in", display: "block", width: "100%" }}
        />

        {/* 右上角：找相似图按钮 */}
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <Tooltip title="寻找类似图片">
            <Button
              shape="circle"
              icon={<SearchOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation(); // 防止触发 onClick
                onFindSimilar?.();
              }}
            />
          </Tooltip>
        </div>

        {/* 左下角：五颗星评分 */}
        <div style={{ position: "absolute", bottom: 8, left: 8 }}>
          <Rate
            value={hoverValue ?? rating ?? 0}
            onChange={(val) => onRatingChange?.(val)}
            onHoverChange={(val) => setHoverValue(val)}
            allowHalf
            style={{ fontSize: 16 }}
          />
        </div>
      </div>
    );
  }
);

ImageItem.displayName = "ImageItem";
export default ImageItem;
