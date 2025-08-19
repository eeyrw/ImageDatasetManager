import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { InputNumber, Button, Row, Col, Card, Typography, Space } from "antd";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const { Title: AntTitle } = Typography;

type DistributionItem = { range: string; count: number };
type AnalysisResult = {
  ratio_distribution: DistributionItem[];
  size_distribution: DistributionItem[];
};

const ImageAnalysisChart: React.FC = () => {
  // 默认值填入
  const [ratioBuckets, setRatioBuckets] = useState(30);
  const [ratioMin, setRatioMin] = useState(0);
  const [ratioMax, setRatioMax] = useState(3);
  const [sizeBuckets, setSizeBuckets] = useState(50);
  const [sizeMin, setSizeMin] = useState(0);
  const [sizeMax, setSizeMax] = useState(3000);

  const [data, setData] = useState<AnalysisResult | null>(null);

  const fetchData = () => {
    const params = new URLSearchParams({
      ratio_min: ratioMin.toString(),
      ratio_max: ratioMax.toString(),
      ratio_buckets: ratioBuckets.toString(),
      size_min: sizeMin.toString(),
      size_max: sizeMax.toString(),
      size_buckets: sizeBuckets.toString(),
    });

    fetch(`http://localhost:8000/analyze_json?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData({
            ratio_distribution: json.ratio_distribution,
            size_distribution: json.size_distribution,
          });
        } else {
          console.error("后端分析失败:", json.error);
        }
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const makeChartData = (items: DistributionItem[], label: string) => ({
    labels: items.map((i) => i.range),
    datasets: [
      {
        label,
        data: items.map((i) => i.count),
        backgroundColor: "rgba(54, 162, 235, 0.7)",
      },
    ],
  });

  if (!data) return <p>加载中...</p>;

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      {/* 参数控制面板 */}
      <Card title="参数设置">
        <Row gutter={16} align="bottom">
          <Col>
            <label>宽高比桶数</label>
            <InputNumber
              min={1}
              defaultValue={30}
              value={ratioBuckets}
              onChange={setRatioBuckets}
            />
          </Col>
          <Col>
            <label>宽高比最小值</label>
            <InputNumber
              defaultValue={0}
              value={ratioMin}
              onChange={setRatioMin}
            />
          </Col>
          <Col>
            <label>宽高比最大值</label>
            <InputNumber
              defaultValue={3}
              value={ratioMax}
              onChange={setRatioMax}
            />
          </Col>
          <Col>
            <label>尺寸桶数</label>
            <InputNumber
              min={1}
              defaultValue={50}
              value={sizeBuckets}
              onChange={setSizeBuckets}
            />
          </Col>
          <Col>
            <label>尺寸最小值</label>
            <InputNumber
              defaultValue={0}
              value={sizeMin}
              onChange={setSizeMin}
            />
          </Col>
          <Col>
            <label>尺寸最大值</label>
            <InputNumber
              defaultValue={3000}
              value={sizeMax}
              onChange={setSizeMax}
            />
          </Col>
          <Col>
            <Button type="primary" onClick={fetchData}>
              更新图表
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 宽高比分布 */}
      <Card>
        <AntTitle level={4}>宽高比分布</AntTitle>
        <Bar data={makeChartData(data.ratio_distribution, "宽高比")} />
      </Card>

      {/* 图片尺寸分布 */}
      <Card>
        <AntTitle level={4}>图片尺寸分布</AntTitle>
        <Bar data={makeChartData(data.size_distribution, "图片尺寸")} />
      </Card>
    </Space>
  );
};

export default ImageAnalysisChart;
