import { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useTheme } from "next-themes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface WeightChartProps {
  data: {
    labels: string[];
    dailyWeights: number[];
    weeklyAverages: number[];
  };
}

type TimeRange = "weekly" | "monthly" | "yearly";

export default function WeightChart({ data }: WeightChartProps) {
  const { theme } = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>("weekly");
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const textColor = theme === "dark" ? "#CBD5E1" : "#475569";
    const gridColor = theme === "dark" ? "rgba(203, 213, 225, 0.1)" : "rgba(71, 85, 105, 0.1)";

    const min = Math.min(...data.dailyWeights.filter(Boolean)) - 0.5;
    const max = Math.max(...data.dailyWeights.filter(Boolean)) + 0.5;

    setChartData({
      labels: data.labels,
      datasets: [
        {
          label: "Daily Weight",
          data: data.dailyWeights,
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
        {
          label: "Weekly Average",
          data: data.weeklyAverages,
          borderColor: "#10B981",
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          fill: false,
        },
      ],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            mode: "index",
            intersect: false,
          },
          legend: {
            position: "top",
            labels: {
              usePointStyle: true,
              boxWidth: 6,
              color: textColor,
            },
          },
        },
        scales: {
          y: {
            min,
            max,
            ticks: {
              stepSize: 0.5,
              color: textColor,
            },
            grid: {
              color: gridColor,
            },
          },
          x: {
            ticks: {
              color: textColor,
            },
            grid: {
              color: gridColor,
            },
          },
        },
        interaction: {
          mode: "nearest",
          intersect: false,
        },
      },
    });
  }, [data, theme]);

  if (!chartData) {
    return <div className="h-64 flex items-center justify-center">Loading chart...</div>;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Weight Tracking</h3>
          <div className="flex space-x-2 mt-2 sm:mt-0">
            <Button
              variant={timeRange === "weekly" ? "default" : "outline"}
              size="sm"
              className={cn(timeRange === "weekly" ? "bg-primary text-white" : "")}
              onClick={() => setTimeRange("weekly")}
            >
              Weekly
            </Button>
            <Button
              variant={timeRange === "monthly" ? "default" : "outline"}
              size="sm"
              className={cn(timeRange === "monthly" ? "bg-primary text-white" : "")}
              onClick={() => setTimeRange("monthly")}
            >
              Monthly
            </Button>
            <Button
              variant={timeRange === "yearly" ? "default" : "outline"}
              size="sm"
              className={cn(timeRange === "yearly" ? "bg-primary text-white" : "")}
              onClick={() => setTimeRange("yearly")}
            >
              Yearly
            </Button>
          </div>
        </div>
        <div className="chart-container">
          <Line data={chartData} options={chartData.options} />
        </div>
      </CardContent>
    </Card>
  );
}
