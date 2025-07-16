import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import WeightTracking from "@/pages/WeightTracking";
import ProgressPhotos from "@/pages/ProgressPhotos";
import Checkins from "@/pages/Checkins";
import Messages from "@/pages/Messages";
import MealPlans from "@/pages/MealPlans";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import Layout from "@/components/layout/Layout";
import { AuthProvider } from "@/hooks/useAuth";
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
            <Route path="/" component={Dashboard} />
            <Route path="/weight-tracking" component={WeightTracking} />
            <Route path="/progress-photos" component={ProgressPhotos} />
            <Route path="/checkins" component={Checkins} />
            <Route path="/messages" component={Messages} />
            <Route path="/meal-plans" component={MealPlans} />
            <Route path="/settings" component={Settings} />
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
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
