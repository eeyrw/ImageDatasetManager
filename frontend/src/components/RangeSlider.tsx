import React, { useState, useEffect } from "react";
import { Slider, Radio, Popover, Button, Typography, Space, Switch, Card, InputNumber } from "antd";
import { EllipsisOutlined } from "@ant-design/icons";

export type SliderMode = "range" | "gte" | "lte";
export type RangeMode = "int" | "float";

export interface RangeSliderStatus {
  value: [number, number];
  sliderMode: SliderMode;
  rangeMode: RangeMode;
  min: number;
  max: number;
  enabled: boolean;
}

interface RangeSliderProps {
  status?: RangeSliderStatus;
  onChange?: (val: RangeSliderStatus) => void;
  step?: number;
  description?: string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ status, onChange, step, description }) => {
  // 初始化状态：如果没有 status 就用默认值
  const [sliderState, setSliderState] = useState<RangeSliderStatus>(
    status ?? {
      value: [0, 100],
      sliderMode: "range",
      rangeMode: "int",
      min: 0,
      max: 100,
      enabled: true,
    }
  );

  // 当父组件传入新的 status 时同步
  useEffect(() => {
    if (status) setSliderState(status);
  }, [status]);

  const handleToggle = (checked: boolean) => {
    const newState = { ...sliderState, enabled: checked };
    setSliderState(newState);
    onChange?.(newState);
  };

  const formatValue = (val: number) =>
    sliderState.rangeMode === "int" ? Math.round(val) : parseFloat(val.toFixed(2));

  const handleSliderChange = (val: number | [number, number]) => {
    let newVal: [number, number];
    if (sliderState.sliderMode === "range") {
      newVal = (val as [number, number]).map(formatValue) as [number, number];
    } else if (sliderState.sliderMode === "gte") {
      newVal = [formatValue(val as number), sliderState.value[1]];
    } else {
      newVal = [sliderState.value[0], formatValue(val as number)];
    }
    const newState = { ...sliderState, value: newVal };
    setSliderState(newState);
    onChange?.(newState);
  };

  const handleModeChange = (mode: SliderMode) => {
    const newState = { ...sliderState, sliderMode: mode };
    setSliderState(newState);
    onChange?.(newState);
  };

  const handleMinChange = (val: number | null) => {
    if (val === null) return;
    const newState = { ...sliderState, min: val, value: [Math.max(val, sliderState.value[0]), sliderState.value[1]] };
    setSliderState(newState);
    onChange?.(newState);
  };

  const handleMaxChange = (val: number | null) => {
    if (val === null) return;
    const newState = { ...sliderState, max: val, value: [sliderState.value[0], Math.min(val, sliderState.value[1])] };
    setSliderState(newState);
    onChange?.(newState);
  };

  const getSliderValue = (): number | [number, number] => {
    if (sliderState.sliderMode === "range") return sliderState.value;
    if (sliderState.sliderMode === "gte") return sliderState.value[0];
    return sliderState.value[1];
  };

  const renderDisplayValue = () => {
    const [minVal, maxVal] = sliderState.value;
    if (sliderState.sliderMode === "range") return `[${minVal}, ${maxVal}]`;
    if (sliderState.sliderMode === "gte") return `≥ ${minVal}`;
    return `≤ ${maxVal}`;
  };

const popoverContent = (
  <Space direction="vertical" size="small">
    {/* 设置范围 */}
    <div>
      最小值:{" "}
      <InputNumber
        size="small"
        value={sliderState.min}
        style={{ width: 100 }}
        onChange={(val) => {
          if (val === null) return;
          const newMin = Math.min(val, sliderState.max); // 保证 min <= max
          let newValue = [...sliderState.value] as [number, number];
          if (newValue[0] < newMin) newValue[0] = newMin;
          if (newValue[1] < newMin) newValue[1] = newMin;
          const newState = { ...sliderState, min: newMin, value: newValue };
          setSliderState(newState);
          onChange?.(newState);
        }}
        disabled={!sliderState.enabled}
      />
    </div>
    <div>
      最大值:{" "}
      <InputNumber
        size="small"
        value={sliderState.max}
        style={{ width: 100 }}
        onChange={(val) => {
          if (val === null) return;
          const newMax = Math.max(val, sliderState.min); // 保证 max >= min
          let newValue = [...sliderState.value] as [number, number];
          if (newValue[0] > newMax) newValue[0] = newMax;
          if (newValue[1] > newMax) newValue[1] = newMax;
          const newState = { ...sliderState, max: newMax, value: newValue };
          setSliderState(newState);
          onChange?.(newState);
        }}
        disabled={!sliderState.enabled}
      />
    </div>

    {/* 精确输入当前值 */}
    {sliderState.sliderMode === "range" && (
      <div>
        当前值:{" "}
        <InputNumber
          size="small"
          value={sliderState.value[0]}
          style={{ width: 70 }}
          min={sliderState.min}
          max={sliderState.value[1]}
          onChange={(val) => {
            if (val === null) return;
            const newVal: [number, number] = [Math.min(Math.max(val, sliderState.min), sliderState.value[1]), sliderState.value[1]];
            const newState = { ...sliderState, value: newVal };
            setSliderState(newState);
            onChange?.(newState);
          }}
          disabled={!sliderState.enabled}
        />
        -
        <InputNumber
          size="small"
          value={sliderState.value[1]}
          style={{ width: 70 }}
          min={sliderState.value[0]}
          max={sliderState.max}
          onChange={(val) => {
            if (val === null) return;
            const newVal: [number, number] = [sliderState.value[0], Math.min(Math.max(val, sliderState.value[0]), sliderState.max)];
            const newState = { ...sliderState, value: newVal };
            setSliderState(newState);
            onChange?.(newState);
          }}
          disabled={!sliderState.enabled}
        />
      </div>
    )}
    {sliderState.sliderMode === "gte" && (
      <div>
        ≥{" "}
        <InputNumber
          size="small"
          value={sliderState.value[0]}
          style={{ width: 100 }}
          min={sliderState.min}
          max={sliderState.max}
          onChange={(val) => {
            if (val === null) return;
            const newState = { ...sliderState, value: [Math.min(Math.max(val, sliderState.min), sliderState.max), sliderState.value[1]] };
            setSliderState(newState);
            onChange?.(newState);
          }}
          disabled={!sliderState.enabled}
        />
      </div>
    )}
    {sliderState.sliderMode === "lte" && (
      <div>
        ≤{" "}
        <InputNumber
          size="small"
          value={sliderState.value[1]}
          style={{ width: 100 }}
          min={sliderState.min}
          max={sliderState.max}
          onChange={(val) => {
            if (val === null) return;
            const newState = { ...sliderState, value: [sliderState.value[0], Math.min(Math.max(val, sliderState.min), sliderState.max)] };
            setSliderState(newState);
            onChange?.(newState);
          }}
          disabled={!sliderState.enabled}
        />
      </div>
    )}
  </Space>
);


  return (
    <Card size="small" style={{ width: 320, opacity: sliderState.enabled ? 1 : 0.5 }} bodyStyle={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Typography.Text>{description}: {renderDisplayValue()}</Typography.Text>
        <Switch size="small" checked={sliderState.enabled} onChange={handleToggle} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Radio.Group
          value={sliderState.sliderMode}
          onChange={(e) => handleModeChange(e.target.value)}
          size="small"
          disabled={!sliderState.enabled}
        >
          <Radio.Button value="range">[a,b]</Radio.Button>
          <Radio.Button value="gte">≥</Radio.Button>
          <Radio.Button value="lte">≤</Radio.Button>
        </Radio.Group>

        <Slider
          range={sliderState.sliderMode === "range"}
          min={sliderState.min}
          max={sliderState.max}
          step={step ?? (sliderState.rangeMode === "int" ? 1 : 0.01)}
          value={getSliderValue() as any}
          onChange={handleSliderChange}
          disabled={!sliderState.enabled}
          style={{ flex: 1 }}
        />

        <Popover content={popoverContent} trigger="click" placement="bottomRight">
          <Button size="small" type="text" icon={<EllipsisOutlined />} style={{ padding: "0 6px" }} disabled={!sliderState.enabled} />
        </Popover>
      </div>
    </Card>
  );
};

export default RangeSlider;
