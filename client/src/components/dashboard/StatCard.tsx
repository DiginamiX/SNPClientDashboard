import { cn } from "@/lib/utils";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: {
    value: string | number;
    type: "increase" | "decrease";
  };
  data?: number[];
  labels?: string[];
  link?: {
    text: string;
    href: string;
  };
}

export default function StatCard({
  title,
  value,
  unit,
  change,
  data = [],
  labels = [],
  link,
}: StatCardProps) {
  const chartData = {
    labels: labels.length > 0 ? labels : ["", "", "", "", "", "", ""],
    datasets: [
      {
        label: title,
        data: data.length > 0 ? data : [0, 0, 0, 0, 0, 0, 0],
        borderColor: "#3B82F6", // primary color
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
        min: Math.min(...data) * 0.995,
        max: Math.max(...data) * 1.005,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </h3>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-slate-800 dark:text-white">
              {value}
            </span>
            {unit && (
              <span className="ml-1 text-slate-600 dark:text-slate-400">
                {unit}
              </span>
            )}
          </div>
        </div>
        {change && (
          <span
            className={cn(
              "inline-flex items-center px-2 py-1 text-xs font-medium rounded-full",
              change.type === "decrease"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
            )}
          >
            <i
              className={cn(
                "mr-1",
                change.type === "decrease"
                  ? "ri-arrow-down-line"
                  : "ri-arrow-up-line"
              )}
            ></i>{" "}
            {change.value}
          </span>
        )}
      </div>
      <div className="mini-chart-container">
        <Line data={chartData} options={chartOptions as any} />
      </div>
      {link && (
        <a
          href={link.href}
          className="text-primary text-sm font-medium hover:text-blue-700 dark:hover:text-blue-400 inline-flex items-center mt-2"
        >
          {link.text} <i className="ri-arrow-right-line ml-1"></i>
        </a>
      )}
    </div>
  );
}
