// ImageItem.tsx
import React from "react";
import { Checkbox } from "antd";

type Props = {
  src: string;
  checked?: boolean;
  onCheckedChange?: (val: boolean) => void;
  onClick?: () => void;
  highlighted?: boolean;  // 是否高亮选中
  selectable?: boolean;   // 是否显示多选框，默认显示
};

const ImageItem = React.forwardRef<HTMLDivElement, Props>(
  ({ src, checked = false, onCheckedChange, onClick, highlighted = true, selectable = true }, ref) => {
    return (
      <div className={`image-item ${highlighted ? "" : "dimmed"}`} ref={ref}>
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
          style={{ cursor: 'zoom-in' }} // 这里加放大镜指针
        />
      </div>
    );
  }
);

ImageItem.displayName = "ImageItem";
export default ImageItem;
