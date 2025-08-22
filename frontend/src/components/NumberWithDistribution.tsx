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
import { Typography, Card } from "antd";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);
const { Text, Title: AntTitle } = Typography;

type DistributionItem = { range: string; count: number };

interface NumberDistributionChartProps {
    apiUrl: string;      // 后端 API 地址
    value?: number;      // 当前值（可选）
    fieldLabel?: string; // 显示标题
    height?: number;     // 图表高度，可选
}

const NumberDistributionChart: React.FC<NumberDistributionChartProps> = ({
    apiUrl,
    value,
    fieldLabel,
    height = 150,
}) => {
    const [dataItems, setDataItems] = useState<DistributionItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(apiUrl)
            .then((res) => res.json())
            .then((json) => {
                if (json.success) {
                    setDataItems(json.charts[0].data);
                } else {
                    console.error("获取分布失败:", json.error || "无数据");
                }
            })
            .finally(() => setLoading(false));
    }, [apiUrl]);

    if (loading) return <p>加载中...</p>;
    if (!dataItems.length) return <p>没有分布数据</p>;

    // 构造 labels 和 counts
    const labels = dataItems.map((i) => i.range);
    const counts = dataItems.map((i) => i.count);
    const backgroundColors = dataItems.map((item) =>
        value !== undefined &&
            value >= parseFloat(item.range.split("~")[0]) &&
            value < parseFloat(item.range.split("~")[1])
            ? "#ff4d4f"
            : "rgba(54, 162, 235, 0.7)"
    );

    // 计算百分位
    let percentile = 0;
    if (value !== undefined) {
        const total = counts.reduce((a, b) => a + b, 0);
        let cumulative = 0;
        for (const item of dataItems) {
            cumulative += item.count;
            const [start, end] = item.range.split("~").map(Number);
            if (value < end) {
                percentile = (cumulative / total) * 100;
                break;
            }
        }
    }

    const chartData = {
        labels,
        datasets: [{ label: fieldLabel, data: counts, backgroundColor: backgroundColors }],
    };

    return (
        <Card>
            {fieldLabel&&(<AntTitle level={4}>{fieldLabel}</AntTitle>)}
            {value !== undefined && (
                <Text>
                    当前值: <b>{value}</b> （约 {percentile.toFixed(1)} 百分位）
                </Text>
            )}
            <div style={{ width: "100%", height }}>
                <Bar
                    data={chartData}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false }, tooltip: { enabled: true } },
                        scales: { x: {}, y: { beginAtZero: true } },
                    }}
                />
            </div>
        </Card>
    );
};

export default NumberDistributionChart;

// ==================== 模拟使用 ====================
export const DemoNumberDistributionChart = () => (
    <div style={{ width: "80%", padding: 20 }}>
        <NumberDistributionChart
            apiUrl="http://localhost:8000/analyze_json?field=quality"
            value={23.7}
            fieldLabel="质量分布"
            height={180}
        />
    </div>
);
