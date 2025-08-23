import React, { useState, useEffect } from "react";
import { Slider, InputNumber, Radio, Space } from "antd";

type RangeMode = "int" | "float";

interface RangeSliderProps {
  value?: [number, number]; // 用户选值
  onChange?: (val: [number, number]) => void;
  defaultMin?: number; // 初始Slider最小值
  defaultMax?: number; // 初始Slider最大值
  step?: number;
  mode?: RangeMode;
}

type SliderMode = "range" | "gte" | "lte";

const RangeSlider: React.FC<RangeSliderProps> = ({
  value = [0, 100],
  onChange,
  defaultMin = 0,
  defaultMax = 100,
  step,
  mode = "int",
}) => {
  const [sliderMode, setSliderMode] = useState<SliderMode>("range");
  const [sliderMin, setSliderMin] = useState(defaultMin);
  const [sliderMax, setSliderMax] = useState(defaultMax);
  const [sliderValue, setSliderValue] = useState<[number, number]>(value);

  useEffect(() => {
    setSliderValue(value);
    if (value[0] < sliderMin) setSliderMin(value[0]);
    if (value[1] > sliderMax) setSliderMax(value[1]);
  }, [value]);

  const formatValue = (val: number) =>
    mode === "int" ? Math.round(val) : parseFloat(val.toFixed(2));

  const handleSliderChange = (val: number | [number, number]) => {
    let newVal: [number, number];
    if (sliderMode === "range") {
      newVal = (val as [number, number]).map(formatValue) as [number, number];
    } else if (sliderMode === "gte") {
      newVal = [formatValue(val as number), sliderValue[1]];
    } else {
      newVal = [sliderValue[0], formatValue(val as number)];
    }
    setSliderValue(newVal);
    onChange?.(newVal);
  };

  const getSliderValue = (): number | [number, number] => {
    if (sliderMode === "range") return sliderValue;
    if (sliderMode === "gte") return sliderValue[0];
    return sliderValue[1];
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {/* 模式选择 */}
      <Radio.Group
        value={sliderMode}
        onChange={(e) => setSliderMode(e.target.value)}
        size="small"
      >
        <Radio.Button value="range">区间</Radio.Button>
        <Radio.Button value="gte">≥</Radio.Button>
        <Radio.Button value="lte">≤</Radio.Button>
      </Radio.Group>
      {/* 左端输入：设置最小值 */}
      <InputNumber
        size="small"
        value={sliderMin}
        onChange={(val) => val !== null && setSliderMin(val)}
        placeholder="Min"
        style={{ width: 70 }}
      />

      {/* Slider */}
      <Slider
        range={sliderMode === "range"}
        min={sliderMin}
        max={sliderMax}
        step={step ?? (mode === "int" ? 1 : 0.01)}
        value={getSliderValue() as any}
        onChange={handleSliderChange}
        style={{ flex: 1 }}
      />

      {/* 右端输入：设置最大值 */}
      <InputNumber
        size="small"
        value={sliderMax}
        onChange={(val) => val !== null && setSliderMax(val)}
        placeholder="Max"
        style={{ width: 70 }}
      />


    </div>
  );
};

export default RangeSlider;
