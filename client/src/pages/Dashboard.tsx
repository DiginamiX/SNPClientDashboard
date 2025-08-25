import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { LoadingSpinner, Skeleton } from "@/components/ui/loading";
import WeightLogForm from "@/components/dashboard/WeightLogForm";
import MessageItem from "@/components/dashboard/MessageItem";
import ProgressPhotos from "@/components/dashboard/ProgressPhotos";
import UpcomingCheckins from "@/components/dashboard/UpcomingCheckins";
import NutritionPlan from "@/components/dashboard/NutritionPlan";
import AssignedWorkouts from "@/components/client/dashboard/AssignedWorkouts";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();

  // Fetch data with loading states
  const { data: weightLogs, isLoading: isLoadingWeightLogs } = useQuery({
    queryKey: ["/api/weight-logs"],
    refetchInterval: false
  });

  const { data: progressPhotos, isLoading: isLoadingPhotos } = useQuery({
    queryKey: ["/api/progress-photos"],
    refetchInterval: false
  });

  const { data: upcomingCheckins, isLoading: isLoadingCheckins } = useQuery({
    queryKey: ["/api/checkins", { upcoming: true }],
    refetchInterval: false
  });

  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["/api/messages"],
    refetchInterval: false
  });

  const { data: nutritionPlan, isLoading: isLoadingNutritionPlan } = useQuery({
    queryKey: ["/api/nutrition-plans", { current: true }],
    refetchInterval: false
  });

  // Mock data for demonstration
  const weightStats = {
    currentWeight: 82.4,
    weeklyChange: -0.8,
    weeklyAverage: 83.1,
    weeklyAverageChange: -1.2,
    consistency: 86,
    consistencyChange: 4,
    dailyData: [83.2, 83.6, 83.1, 82.9, 82.7, 82.5, 82.4],
    weeklyData: [86.4, 85.2, 84.3, 83.5, 83.1]
  };

  const mockPhotos = [
    {
      id: 1,
      date: "2023-06-01",
      imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
      category: "Front"
    },
    {
      id: 2,
      date: "2023-05-15", 
      imageUrl: "https://images.unsplash.com/photo-1594381898411-846e7d193883?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
      category: "Side"
    }
  ];

  const mockMessages = [
    {
      id: 1,
      sender: {
        name: "Coach Sarah",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40"
      },
      preview: "Great progress on your weight loss this week! Let's discuss next steps...",
      time: new Date(Date.now() - 2 * 60 * 60 * 1000),
      unread: true
    }
  ];

  const getNextCheckInDate = () => {
    if (!isLoadingCheckins && upcomingCheckins?.length > 0) {
      return format(new Date(upcomingCheckins[0].date), "MMMM d, yyyy");
    }
    return "June 15, 2023";
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Hero Section */}
      <Card variant="gradient-orange" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20" />
        
        <CardContent className="relative p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                Welcome back, {user?.firstName || "John"}! 👋
              </h1>
              <p className="text-white/80 text-lg">
                Your next check-in is scheduled for{" "}
                <span className="font-semibold text-white">{getNextCheckInDate()}</span>
              </p>
            </div>
            <div className="mt-6 md:mt-0">
              <Button 
                variant="glass" 
                size="lg" 
                onClick={() => setLocation("/checkins")}
                className="text-white border-white/20 hover:bg-white/20"
              >
                <i className="ri-calendar-line mr-2"></i>
                Schedule Check-in
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Current Weight"
          value={weightStats.currentWeight}
          unit="kg"
          change={{
            value: `${Math.abs(weightStats.weeklyChange)} kg`,
            type: weightStats.weeklyChange < 0 ? 'decrease' : 'increase'
          }}
          trend={weightStats.dailyData}
          icon={<i className="ri-scales-3-line text-primary w-5 h-5" />}
          variant="premium"
        />

        <MetricCard
          title="Weekly Average"
          value={weightStats.weeklyAverage}
          unit="kg"
          change={{
            value: `${Math.abs(weightStats.weeklyAverageChange)} kg`,
            type: weightStats.weeklyAverageChange < 0 ? 'decrease' : 'increase'
          }}
          trend={weightStats.weeklyData}
          icon={<i className="ri-bar-chart-line text-custom-blue-500 w-5 h-5" />}
          variant="premium"
        />

        <MetricCard
          title="Consistency"
          value={`${weightStats.consistency}%`}
          change={{
            value: `${weightStats.consistencyChange}%`,
            type: 'increase'
          }}
          icon={<i className="ri-trophy-line text-green-500 w-5 h-5" />}
          variant="premium"
        />
      </div>

      {/* Assigned Workouts Section */}
      <AssignedWorkouts />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weight Chart Section */}
        <div className="lg:col-span-2">
          <Card variant="premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="ri-line-chart-line text-primary" />
                Weight Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingWeightLogs ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" variant="orange" />
                </div>
              ) : (
                <div className="h-64 bg-gradient-to-br from-orange-50 to-blue-50 dark:from-orange-950/10 dark:to-blue-950/10 rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Weight chart will render here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Messages */}
        <Card variant="premium">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <i className="ri-message-2-line text-primary" />
                Messages
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation("/messages")}
                className="text-primary hover:text-primary/80"
              >
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingMessages ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {mockMessages.map(message => (
                  <MessageItem
                    key={message.id}
                    sender={message.sender}
                    preview={message.preview}
                    time={message.time}
                    unread={message.unread}
                    onClick={() => setLocation("/messages")}
                  />
                ))}
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => setLocation("/messages")}
                >
                  <i className="ri-message-2-line mr-2" />
                  New Message
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight Log Form */}
        <WeightLogForm />

        {/* Progress Photos */}
        <ProgressPhotos 
          photos={mockPhotos}
          onUploadClick={() => setLocation("/progress-photos")}
        />
      </div>

      {/* Final Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingCheckins 
          checkins={[]}
          onViewCalendarClick={() => setLocation("/checkins")}
        />

        <NutritionPlan 
          plan={{
            updatedAt: "2023-05-30T14:30:00",
            macros: {
              protein: { name: "Protein", current: 180, target: 180, color: "bg-orange-500" },
              carbs: { name: "Carbs", current: 200, target: 220, color: "bg-custom-blue-500" },
              fat: { name: "Fat", current: 65, target: 70, color: "bg-green-500" },
              calories: { name: "Total Calories", current: 2105, target: 2230, color: "bg-purple-500" }
            },
            coachNotes: "Great job hitting your protein goals consistently!"
          }}
          onViewFullPlanClick={() => setLocation("/meal-plans")}
        />
      </div>
    </div>
  );
}
