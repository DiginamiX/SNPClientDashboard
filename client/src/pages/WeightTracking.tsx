import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, subWeeks, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WeightLogForm from "@/components/dashboard/WeightLogForm";
import { Button } from "@/components/ui/button";
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
import { Line } from "react-chartjs-2";
import { useTheme } from "next-themes";

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

export default function WeightTracking() {
  const [activeTab, setActiveTab] = useState("weekly");
  const { theme } = useTheme();
  
  // Fetch weight logs
  const { data: weightLogs, isLoading } = useQuery({
    queryKey: ["/api/weight-logs"],
    refetchInterval: false
  });

  const defaultChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: theme === "dark" ? "#cbd5e1" : "#475569",
          usePointStyle: true,
          boxWidth: 6
        }
      },
      tooltip: {
        mode: "index" as const,
        intersect: false
      }
    },
    scales: {
      y: {
        min: 75,
        max: 95,
        ticks: {
          color: theme === "dark" ? "#cbd5e1" : "#475569",
          stepSize: 1
        },
        grid: {
          color: theme === "dark" ? "rgba(203, 213, 225, 0.1)" : "rgba(71, 85, 105, 0.1)"
        }
      },
      x: {
        ticks: {
          color: theme === "dark" ? "#cbd5e1" : "#475569"
        },
        grid: {
          color: theme === "dark" ? "rgba(203, 213, 225, 0.1)" : "rgba(71, 85, 105, 0.1)"
        }
      }
    },
    interaction: {
      mode: "nearest" as const,
      intersect: false
    }
  };

  // Example data for weekly chart
  const weeklyData = {
    labels: ["May 30", "May 31", "Jun 1", "Jun 2", "Jun 3", "Jun 4", "Jun 5", "Jun 6", "Jun 7", "Jun 8"],
    datasets: [
      {
        label: "Daily Weight",
        data: [83.2, 83.1, 82.9, 82.7, 82.6, 82.5, 82.4, 82.6, 82.3, 82.4],
        borderColor: "#3B82F6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6
      },
      {
        label: "7-Day Average",
        data: [83.5, 83.4, 83.3, 83.2, 83.1, 83.0, 82.9, 82.8, 82.6, 82.5],
        borderColor: "#10B981",
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 5,
        fill: false
      }
    ]
  };

  // Example data for monthly chart
  const monthlyData = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"],
    datasets: [
      {
        label: "Weekly Average",
        data: [86.4, 85.2, 84.3, 83.5, 83.1],
        borderColor: "#3B82F6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 7
      }
    ]
  };

  // Example data for yearly chart
  const yearlyData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    datasets: [
      {
        label: "Monthly Average",
        data: [90, 89, 88, 87, 85, 83, null, null, null, null, null, null],
        borderColor: "#3B82F6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 7,
        fill: {
          target: "origin",
          above: "rgba(59, 130, 246, 0.1)"
        }
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Weight Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
              <TabsContent value="weekly" className="h-[400px]">
                <Line data={weeklyData} options={defaultChartOptions} />
              </TabsContent>
              <TabsContent value="monthly" className="h-[400px]">
                <Line 
                  data={monthlyData} 
                  options={{
                    ...defaultChartOptions,
                    scales: {
                      ...defaultChartOptions.scales,
                      y: {
                        ...defaultChartOptions.scales.y,
                        min: 82,
                        max: 87
                      }
                    }
                  }} 
                />
              </TabsContent>
              <TabsContent value="yearly" className="h-[400px]">
                <Line 
                  data={yearlyData} 
                  options={{
                    ...defaultChartOptions,
                    scales: {
                      ...defaultChartOptions.scales,
                      y: {
                        ...defaultChartOptions.scales.y,
                        min: 80,
                        max: 95
                      }
                    }
                  }} 
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <WeightLogForm />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weight History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Date</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Weight</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Change</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Notes</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-500 dark:text-slate-400">
                      Loading weight data...
                    </td>
                  </tr>
                ) : (
                  [
                    { date: "2023-06-08", weight: 82.4, change: -0.1, notes: "Feeling good today" },
                    { date: "2023-06-07", weight: 82.5, change: 0.1, notes: "High stress day" },
                    { date: "2023-06-06", weight: 82.4, change: -0.2, notes: "" },
                    { date: "2023-06-05", weight: 82.6, change: 0.1, notes: "After weekend" },
                    { date: "2023-06-04", weight: 82.5, change: -0.2, notes: "Weekend hiking" },
                    { date: "2023-06-03", weight: 82.7, change: -0.2, notes: "" },
                    { date: "2023-06-02", weight: 82.9, change: -0.2, notes: "Reduced carbs" },
                    { date: "2023-06-01", weight: 83.1, change: -0.1, notes: "New month!" },
                    { date: "2023-05-31", weight: 83.2, change: 0.1, notes: "" },
                    { date: "2023-05-30", weight: 83.1, change: -0.1, notes: "Back on track" }
                  ].map((entry, index) => (
                    <tr 
                      key={index} 
                      className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="py-3 px-4">{format(parseISO(entry.date), "MMM d, yyyy")}</td>
                      <td className="py-3 px-4 text-right font-medium">{entry.weight} kg</td>
                      <td className={`py-3 px-4 text-right font-medium ${entry.change < 0 ? "text-green-600 dark:text-green-400" : entry.change > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`}>
                        {entry.change === 0 ? "-" : entry.change > 0 ? `+${entry.change}` : entry.change}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {entry.notes || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 flex justify-center">
            <Button variant="outline" size="sm">
              Load More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
