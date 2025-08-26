import React, { useState } from "react";
import { Checkbox, Rate } from "antd";

type Props = {
  src: string;
  checked?: boolean;
  onCheckedChange?: (val: boolean) => void;
  onClick?: () => void;
  highlighted?: boolean;
  selectable?: boolean;
  rating?: number | null;        // 当前评分，null 表示未评分
  onRatingChange?: (val: number) => void;
};

const ImageItem = React.forwardRef<HTMLDivElement, Props>(
  ({
    src,
    checked = false,
    onCheckedChange,
    onClick,
    highlighted = true,
    selectable = true,
    rating = null,
    onRatingChange,
  }, ref) => {
    const [hoverValue, setHoverValue] = useState<number | null>(null);

    return (
      <div className={`image-item ${highlighted ? "" : "dimmed"}`} ref={ref} style={{ position: 'relative' }}>
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
          style={{ cursor: 'zoom-in', display: 'block', width: '100%' }}
        />

        {/* 五颗星评分 */}
        <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
          <Rate
            value={hoverValue ?? rating ?? 0} // hover 时显示 hoverValue，未评分时显示 0
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