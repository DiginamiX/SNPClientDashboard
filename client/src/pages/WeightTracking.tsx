import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subMonths, subWeeks, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WeightLogForm from "@/components/dashboard/WeightLogForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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

interface DeviceIntegration {
  id: number;
  provider: string;
  externalId: string | null;
  accessToken: string;
  lastSyncedAt: string | null;
  isActive: boolean;
}

export default function WeightTracking() {
  const [activeTab, setActiveTab] = useState("weekly");
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [feelfitCredentials, setFeelfitCredentials] = useState({ email: "", password: "" });
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  
  // Fetch weight logs
  const { data: weightLogs, isLoading } = useQuery({
    queryKey: ["/api/weight-logs"],
    refetchInterval: false
  });
  
  // Fetch device integrations
  const { data: integrations = [], isLoading: isLoadingIntegrations } = useQuery<DeviceIntegration[]>({
    queryKey: ["/api/integrations"],
    refetchInterval: false
  });

  // State for selected integration
  const [selectedIntegration, setSelectedIntegration] = useState<DeviceIntegration | null>(null);
  
  // Find Feelfit integration if exists
  useEffect(() => {
    if (integrations && integrations.length > 0) {
      const feelfit = integrations.find((i: DeviceIntegration) => i.provider === "feelfit");
      if (feelfit) {
        setSelectedIntegration(feelfit);
      }
    }
  }, [integrations]);
  
  // Create/update integration mutation
  const { mutate: connectFeeelfit, isPending: isConnecting } = useMutation({
    mutationFn: async () => {
      // In a real implementation, we would securely obtain a token from Feelfit API
      // For demo purposes, we're simulating the connection with a placeholder token
      const integrationData = {
        provider: "feelfit",
        accessToken: "simulated-token", // This would come from Feelfit API
        externalId: feelfitCredentials.email,
        isActive: true,
        metadata: JSON.stringify({
          lastSync: new Date().toISOString()
        })
      };
      
      return apiRequest("POST", "/api/integrations", integrationData);
    },
    onSuccess: () => {
      toast({
        title: "Connected to Feelfit",
        description: "Your Feelfit scale has been connected successfully. Weight data will now sync automatically.",
      });
      setIsConnectDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
    },
    onError: (error) => {
      toast({
        title: "Connection failed",
        description: "Failed to connect to Feelfit. Please check your credentials and try again.",
        variant: "destructive"
      });
    }
  });
  
  // Delete integration mutation
  const { mutate: disconnectDevice, isPending: isDisconnecting } = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/integrations/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Device disconnected",
        description: "Your Feelfit scale has been disconnected."
      });
      setSelectedIntegration(null);
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
    }
  });
  
  const handleConnectFeeelfit = () => {
    if (!feelfitCredentials.email || !feelfitCredentials.password) {
      toast({
        title: "Missing information",
        description: "Please provide both email and password",
        variant: "destructive"
      });
      return;
    }
    
    connectFeeelfit();
  };

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

      {/* Device Integrations Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Connected Devices</span>
            <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsConnectDialogOpen(true)}
                  disabled={selectedIntegration !== null}
                >
                  {selectedIntegration ? "Already Connected" : "Connect Scale"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect Feelfit Scale</DialogTitle>
                  <DialogDescription>
                    Connect your Feelfit smart scale to automatically sync your weight measurements.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="feelfit-email" className="text-right">
                      Feelfit Email
                    </Label>
                    <Input
                      id="feelfit-email"
                      placeholder="email@example.com"
                      className="col-span-3"
                      value={feelfitCredentials.email}
                      onChange={(e) => setFeelfitCredentials(prev => ({ ...prev, email: e.target.value }))}
                      disabled={isConnecting}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="feelfit-password" className="text-right">
                      Feelfit Password
                    </Label>
                    <Input
                      id="feelfit-password"
                      type="password"
                      placeholder="••••••••"
                      className="col-span-3"
                      value={feelfitCredentials.password}
                      onChange={(e) => setFeelfitCredentials(prev => ({ ...prev, password: e.target.value }))}
                      disabled={isConnecting}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <div></div>
                    <div className="col-span-3 text-sm text-muted-foreground">
                      We'll use these credentials to create an API connection with Feelfit. Your password is never stored.
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={() => setIsConnectDialogOpen(false)}
                    disabled={isConnecting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    onClick={handleConnectFeeelfit}
                    disabled={isConnecting}
                  >
                    {isConnecting ? "Connecting..." : "Connect Scale"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Connect your fitness tracking devices to automatically sync your weight data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoadingIntegrations ? (
              <div className="text-center py-4 text-muted-foreground">Loading connected devices...</div>
            ) : selectedIntegration ? (
              <div className="flex items-center justify-between border p-4 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="24" rx="4" fill="#2563EB" fillOpacity="0.2"/>
                      <path d="M12 4L19 8V16L12 20L5 16V8L12 4Z" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 20V12" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 8L12 12L19 8" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium">Feelfit Smart Scale</h4>
                    <p className="text-sm text-muted-foreground">
                      Last synced: {selectedIntegration.lastSyncedAt ? 
                        format(new Date(selectedIntegration.lastSyncedAt), "MMM d, yyyy h:mm a") : 
                        "Never"
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge variant="default" className="mr-4">
                    Connected
                  </Badge>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      if (selectedIntegration) {
                        disconnectDevice(selectedIntegration.id);
                      }
                    }}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border rounded-lg">
                <h4 className="font-medium mb-2">No devices connected</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your Feelfit scale to automatically sync your weight measurements
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setIsConnectDialogOpen(true)}
                >
                  Connect Feelfit Scale
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Source</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-500 dark:text-slate-400">
                      Loading weight data...
                    </td>
                  </tr>
                ) : (
                  [
                    { date: "2023-06-08", weight: 82.4, change: -0.1, notes: "Feeling good today", source: "Manual" },
                    { date: "2023-06-07", weight: 82.5, change: 0.1, notes: "High stress day", source: "Manual" },
                    { date: "2023-06-06", weight: 82.4, change: -0.2, notes: "", source: "Manual" },
                    { date: "2023-06-05", weight: 82.6, change: 0.1, notes: "After weekend", source: "Manual" },
                    { date: "2023-06-04", weight: 82.5, change: -0.2, notes: "Weekend hiking", source: "Manual" },
                    { date: "2023-06-03", weight: 82.7, change: -0.2, notes: "", source: "Manual" },
                    { date: "2023-06-02", weight: 82.9, change: -0.2, notes: "Reduced carbs", source: "Manual" },
                    { date: "2023-06-01", weight: 83.1, change: -0.1, notes: "New month!", source: "Manual" },
                    { date: "2023-05-31", weight: 83.2, change: 0.1, notes: "", source: "Manual" },
                    { date: "2023-05-30", weight: 83.1, change: -0.1, notes: "Back on track", source: "Manual" }
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
                      <td className="py-3 px-4">
                        <Badge variant={entry.source === "Manual" ? "outline" : "default"}>
                          {entry.source}
                        </Badge>
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
