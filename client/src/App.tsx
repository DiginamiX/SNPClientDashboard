import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Client pages
import Dashboard from "@/pages/Dashboard";
import WeightTracking from "@/pages/WeightTracking";
import ProgressPhotos from "@/pages/ProgressPhotos";
import Checkins from "@/pages/Checkins";
import Messages from "@/pages/Messages";
import MealPlans from "@/pages/MealPlans";
import Settings from "@/pages/Settings";

// Coach pages
import CoachDashboard from "@/pages/coach/Dashboard";
import CoachClients from "@/pages/coach/Clients";
import CoachWorkouts from "@/pages/coach/Workouts";

// Client pages
import WorkoutExecution from "@/pages/client/WorkoutExecution";
import MyWorkouts from "@/pages/client/MyWorkouts";

// Auth pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";

import Layout from "@/components/layout/Layout";
import { SupabaseAuthProvider } from "@/hooks/useSupabaseAuth";
import { ThemeProvider } from "next-themes";

function Router() {
  const [location] = useLocation();
  const isAuthPage = location === "/login" || location === "/register" || location === "/forgot-password";

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      {isAuthPage ? null : (
        <Layout>
          <Switch>
            {/* Client routes */}
            <Route path="/" component={Dashboard} />
            <Route path="/my-workouts" component={MyWorkouts} />
            <Route path="/weight-tracking" component={WeightTracking} />
            <Route path="/progress-photos" component={ProgressPhotos} />
            <Route path="/checkins" component={Checkins} />
            <Route path="/messages" component={Messages} />
            <Route path="/meal-plans" component={MealPlans} />
            <Route path="/settings" component={Settings} />
            
                      {/* Coach routes */}
          <Route path="/coach" component={CoachDashboard} />
          <Route path="/coach/dashboard" component={CoachDashboard} />
          <Route path="/coach/clients" component={CoachClients} />
          <Route path="/coach/workouts" component={CoachWorkouts} />
          
          {/* Client workout execution */}
          <Route path="/workout/:assignmentId" component={WorkoutExecution} />
            
            <Route component={NotFound} />
          </Switch>
        </Layout>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <SupabaseAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </SupabaseAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
