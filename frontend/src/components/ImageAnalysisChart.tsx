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
import { Card, Typography, Tabs } from "antd";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);
const { Title: AntTitle } = Typography;

type DistributionItem = { range: string; count: number };
type ChartItem = { name: string; data: DistributionItem[] };

const ImageAnalysisChart: React.FC = () => {
  const [charts, setCharts] = useState<ChartItem[]>([]);

  const fetchData = () => {
    fetch(`http://localhost:8000/analyze_json?fields=ratio,size,quality,aes`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setCharts(json.charts);
        } else {
          console.error("分析失败:", json.error);
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

  if (!charts.length) return <p>加载中...</p>;

  // 构造 Tabs 的 items
  const tabItems = charts.map((c, index) => ({
    key: String(index),
    label: c.name,
    children: (
      <Card>
        <AntTitle level={4}>{c.name}</AntTitle>
        <Bar data={makeChartData(c.data, c.name)} />
      </Card>
    ),
  }));

  return <Tabs defaultActiveKey="0" items={tabItems} />;
};

export default ImageAnalysisChart;
