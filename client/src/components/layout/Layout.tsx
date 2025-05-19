import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "@/hooks/useAuth";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [title, setTitle] = useState("Dashboard");
  const [location, setLocation] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Update title based on current path
    switch (location) {
      case "/":
        setTitle("Dashboard");
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
      default:
        setTitle("Dashboard");
    }
  }, [location]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [user, loading, setLocation]);

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
