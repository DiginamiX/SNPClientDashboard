import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import StatCard from "@/components/dashboard/StatCard";
import WeightChart from "@/components/dashboard/WeightChart";
import WeightLogForm from "@/components/dashboard/WeightLogForm";
import MessageItem from "@/components/dashboard/MessageItem";
import ProgressPhotos from "@/components/dashboard/ProgressPhotos";
import UpcomingCheckins from "@/components/dashboard/UpcomingCheckins";
import NutritionPlan from "@/components/dashboard/NutritionPlan";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();

  // Mock data for initial render
  const weightChartData = {
    labels: [
      "May 8", "May 9", "May 10", "May 11", "May 12", "May 13", "May 14", 
      "May 15", "May 16", "May 17", "May 18", "May 19", "May 20", "May 21", 
      "May 22", "May 23", "May 24", "May 25", "May 26", "May 27", "May 28", 
      "May 29", "May 30", "May 31", "Jun 1", "Jun 2", "Jun 3", "Jun 4", 
      "Jun 5", "Jun 6", "Jun 7", "Jun 8"
    ],
    dailyWeights: [
      84.6, 84.8, 84.5, 84.3, 84.2, 84.5, 84.7, 84.4, 84.2, 84.1, 
      83.9, 84.0, 83.7, 83.9, 84.1, 83.8, 83.6, 83.5, 83.7, 83.8, 
      83.5, 83.4, 83.2, 83.6, 83.1, 82.9, 82.7, 82.5, 82.4, 82.6, 
      82.3, 82.4
    ],
    weeklyAverages: [
      null, null, null, null, null, null, 84.5, 84.4, 84.3, 84.2, 84.1, 
      84.0, 83.9, 84.0, 83.9, 83.8, 83.7, 83.7, 83.6, 83.7, 83.7, 
      83.6, 83.5, 83.5, 83.4, 83.3, 83.2, 83.1, 83.0, 82.8, 82.6, 82.5
    ]
  };

  // Mock data for stats
  const weightStats = {
    currentWeight: 82.4,
    weeklyChange: 0.8,
    weeklyAverage: 83.1,
    weeklyAverageChange: 1.2,
    consistency: 86,
    consistencyChange: 4,
    dailyData: [83.2, 83.6, 83.1, 82.9, 82.7, 82.5, 82.4],
    weeklyData: [86.4, 85.2, 84.3, 83.5, 83.1]
  };

  // Fetch weight logs
  const { data: weightLogs, isLoading: isLoadingWeightLogs } = useQuery({
    queryKey: ["/api/weight-logs"],
    refetchInterval: false
  });

  // Fetch progress photos
  const { data: progressPhotos, isLoading: isLoadingPhotos } = useQuery({
    queryKey: ["/api/progress-photos"],
    refetchInterval: false
  });

  // Fetch upcoming check-ins
  const { data: upcomingCheckins, isLoading: isLoadingCheckins } = useQuery({
    queryKey: ["/api/checkins", { upcoming: true }],
    refetchInterval: false
  });

  // Fetch messages
  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["/api/messages"],
    refetchInterval: false
  });

  // Fetch current nutrition plan
  const { data: nutritionPlan, isLoading: isLoadingNutritionPlan } = useQuery({
    queryKey: ["/api/nutrition-plans", { current: true }],
    refetchInterval: false
  });

  // Mock data for photos while loading
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
    },
    {
      id: 3,
      date: "2023-05-01",
      imageUrl: "https://images.unsplash.com/photo-1573879541250-58ae8b322b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
      category: "Back"
    },
    {
      id: 4,
      date: "2023-04-15",
      imageUrl: "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
      category: "Front"
    }
  ];

  // Mock data for messages while loading
  const mockMessages = [
    {
      id: 1,
      sender: {
        name: "Coach Sarah",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40"
      },
      preview: "Great progress on your weight loss this week! Let's discuss next steps...",
      time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      unread: true
    },
    {
      id: 2,
      sender: {
        name: "Coach Mike",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40"
      },
      preview: "I've updated your nutrition plan. Please check and let me know your thoughts.",
      time: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      unread: false
    },
    {
      id: 3,
      sender: {
        name: "Support Team",
        avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40"
      },
      preview: "Your last check-in has been rescheduled to June 15th. Please confirm.",
      time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      unread: false
    }
  ];

  // Mock data for checkins while loading
  const mockCheckins = [
    {
      id: 1,
      date: "2023-06-15",
      startTime: "2023-06-15T10:00:00",
      endTime: "2023-06-15T10:30:00",
      coachName: "Coach Sarah",
      status: "confirmed" as const,
      title: "Monthly Progress Review"
    },
    {
      id: 2,
      date: "2023-07-13",
      startTime: "2023-07-13T10:00:00",
      endTime: "2023-07-13T10:30:00",
      coachName: "Coach Sarah",
      status: "scheduled" as const,
      title: "Monthly Progress Review"
    }
  ];

  // Mock data for nutrition plan while loading
  const mockNutritionPlan = {
    updatedAt: "2023-05-30T14:30:00",
    macros: {
      protein: { name: "Protein", current: 180, target: 180, color: "bg-accent" },
      carbs: { name: "Carbs", current: 200, target: 220, color: "bg-primary" },
      fat: { name: "Fat", current: 65, target: 70, color: "bg-secondary" },
      calories: { name: "Total Calories", current: 2105, target: 2230, color: "bg-blue-400" }
    },
    coachNotes: "Great job hitting your protein goals consistently. We'll continue with these macros through the next 2 weeks, then evaluate for potential adjustments based on your progress."
  };

  const getNextCheckInDate = () => {
    if (!isLoadingCheckins && upcomingCheckins?.length > 0) {
      return format(new Date(upcomingCheckins[0].date), "MMMM d, yyyy");
    }
    return "June 15, 2023"; // Default fallback
  };

  return (
    <>
      {/* Welcome Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              Welcome back, {user?.firstName || "John"}!
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Your next check-in is scheduled for{" "}
              <span className="font-medium text-primary">{getNextCheckInDate()}</span>
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button className="bg-primary hover:bg-blue-600 text-white" onClick={() => navigate("/checkins")}>
              <i className="ri-calendar-line mr-1"></i> Schedule Check-in
            </Button>
          </div>
        </div>
      </div>

      {/* Weight and Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Weight Card */}
        <StatCard
          title="Current Weight"
          value={weightStats.currentWeight}
          unit="kg"
          change={{
            value: `${weightStats.weeklyChange} kg`,
            type: "decrease"
          }}
          data={weightStats.dailyData}
          link={{
            text: "View details",
            href: "/weight-tracking"
          }}
        />

        {/* Weekly Average Card */}
        <StatCard
          title="Weekly Average"
          value={weightStats.weeklyAverage}
          unit="kg"
          change={{
            value: `${weightStats.weeklyAverageChange} kg`,
            type: "decrease"
          }}
          data={weightStats.weeklyData}
          link={{
            text: "View details",
            href: "/weight-tracking"
          }}
        />

        {/* Compliance Card */}
        <StatCard
          title="Weigh-in Consistency"
          value={`${weightStats.consistency}%`}
          unit="compliance"
          change={{
            value: `${weightStats.consistencyChange}%`,
            type: "increase"
          }}
          link={{
            text: "View details",
            href: "/weight-tracking"
          }}
        />
      </div>

      {/* Weight Tracking & Recent Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Weight Chart Section */}
        <div className="lg:col-span-2">
          <WeightChart data={weightChartData} />
        </div>

        {/* Recent Messages */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Recent Messages</h3>
              <a href="/messages" className="text-primary text-sm font-medium hover:text-blue-700 dark:hover:text-blue-400">
                View all
              </a>
            </div>

            {mockMessages.map(message => (
              <MessageItem
                key={message.id}
                sender={message.sender}
                preview={message.preview}
                time={message.time}
                unread={message.unread}
                onClick={() => navigate("/messages")}
              />
            ))}

            <div className="mt-4">
              <Button variant="outline" className="w-full" onClick={() => navigate("/messages")}>
                <i className="ri-message-2-line mr-1"></i> New Message
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Log Weight & Progress Photos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Log Weight Form */}
        <WeightLogForm />

        {/* Recent Progress Photos */}
        <ProgressPhotos 
          photos={mockPhotos}
          onUploadClick={() => navigate("/progress-photos")}
        />
      </div>

      {/* Upcoming Check-ins & Nutrition Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Check-ins */}
        <UpcomingCheckins 
          checkins={mockCheckins}
          onViewCalendarClick={() => navigate("/checkins")}
        />

        {/* Nutrition Plan */}
        <NutritionPlan 
          plan={mockNutritionPlan}
          onViewFullPlanClick={() => navigate("/meal-plans")}
        />
      </div>
    </>
  );
}
