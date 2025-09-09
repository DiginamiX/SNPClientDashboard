import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "@/hooks/useSupabaseAuth";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [title, setTitle] = useState("Dashboard");
  const [location, setLocation] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Update title based on current path and user role
    const isCoach = user?.role === 'admin';
    
    console.log('🏠 Layout role check:', {
      userRole: user?.role,
      isCoach,
      location,
      user: user ? { id: user.id, email: user.email, role: user.role } : null
    })
    
    switch (location) {
      case "/":
        setTitle(isCoach ? "Coach Dashboard" : "Dashboard");
        break;
      case "/my-workouts":
        setTitle("My Workouts");
        break;
      case "/weight-tracking":
        setTitle("Weight Tracking");
        break;
      case "/progress-photos":
        setTitle("Progress Photos");
        break;
      case "/checkins":
        setTitle("Check-ins");
        break;
      case "/messages":
        setTitle("Messages");
        break;
      case "/meal-plans":
        setTitle("Meal Plans");
        break;
      case "/coach":
      case "/coach/dashboard":
        setTitle("Coach Dashboard");
        break;
      case "/coach/clients":
        setTitle("Client Management");
        break;
      case "/coach/workouts":
        setTitle("Workout Programming");
        break;
      case "/coach/programs":
        setTitle("Program Builder");
        break;
      case "/coach/analytics":
        setTitle("Analytics");
        break;
      case "/settings":
        setTitle("Settings");
        break;
      default:
        setTitle(isCoach ? "Coach Dashboard" : "Dashboard");
    }
  }, [location, user]);

  // Redirect to login if not authenticated, or redirect coaches to their dashboard
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    } else if (!loading && user && user.role === 'admin' && location === '/') {
      // Redirect coaches from client dashboard to coach dashboard
      setLocation("/coach/dashboard");
    }
  }, [user, loading, setLocation, location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen h-full">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-h-screen">
        <Header title={title} setSidebarOpen={setSidebarOpen} />

        <main 
          className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-slate-900"
          onClick={() => {
            if (sidebarOpen) {
              setSidebarOpen(false);
            }
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
