import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useSupabaseAuth";
import { cn } from "@/lib/utils";

interface SidebarNavItemProps {
  href: string;
  icon: string;
  label: string;
  badge?: number;
}

const SidebarNavItem = ({ href, icon, label, badge }: SidebarNavItemProps) => {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <Link href={href}>
      <span
        className={cn(
          "flex items-center px-4 py-3 text-base font-medium rounded-lg cursor-pointer transition-colors duration-200",
          isActive
            ? "bg-blue-50 dark:bg-slate-700 text-primary dark:text-blue-400"
            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
        )}
      >
        <i className={`${icon} text-xl mr-3`}></i>
        <span>{label}</span>
        {badge && (
          <span className="ml-auto bg-primary text-white text-xs px-2 py-1 rounded-full">
            {badge}
          </span>
        )}
      </span>
    </Link>
  );
};

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const { user, logout } = useAuth();
  const isCoach = user?.role === 'admin';

  // Navigation items based on user role
  const clientNavItems = [
    { href: "/", icon: "ri-dashboard-line", label: "Dashboard" },
    { href: "/weight-tracking", icon: "ri-scales-3-line", label: "Weight Tracking" },
    { href: "/progress-photos", icon: "ri-image-line", label: "Progress Photos" },
    { href: "/checkins", icon: "ri-calendar-check-line", label: "Check-ins" },
    { href: "/messages", icon: "ri-message-3-line", label: "Messages", badge: 3 },
    { href: "/meal-plans", icon: "ri-restaurant-line", label: "Meal Plans" },
  ];

  const coachNavItems = [
    { href: "/coach/dashboard", icon: "ri-dashboard-line", label: "Dashboard" },
    { href: "/coach/clients", icon: "ri-team-line", label: "Clients" },
    { href: "/coach/workouts", icon: "ri-fitness-line", label: "Workouts" },
    { href: "/coach/programs", icon: "ri-calendar-line", label: "Programs" },
    { href: "/coach/nutrition", icon: "ri-restaurant-line", label: "Nutrition" },
    { href: "/coach/analytics", icon: "ri-bar-chart-line", label: "Analytics" },
    { href: "/messages", icon: "ri-message-3-line", label: "Messages", badge: 7 },
  ];

  const navItems = isCoach ? coachNavItems : clientNavItems;

  return (
    <div
      className={cn(
        "fixed z-30 inset-y-0 left-0 w-64 transition duration-300 transform bg-white dark:bg-slate-800 shadow-lg md:translate-x-0 md:static md:inset-0",
        {
          "translate-x-0": sidebarOpen,
          "-translate-x-full": !sidebarOpen,
        }
      )}
    >
      <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center">
          <div className="flex items-center">
            <img 
              src="/snp-logo.png" 
              alt="Stuart Nutrition and Performance" 
              className="h-10"
              style={{
                filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.15))'
              }}
            />
          </div>
          <span className="ml-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {isCoach ? 'Coach Portal' : 'Client Portal'}
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden text-slate-500 hover:text-slate-600 dark:text-slate-400"
        >
          <i className="ri-close-line text-2xl"></i>
        </button>
      </div>
      
      <nav className="mt-5 px-2 space-y-1">
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            badge={item.badge}
          />
        ))}

        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
          <SidebarNavItem
            href="/settings"
            icon="ri-settings-4-line"
            label="Settings"
          />
          <button
            onClick={logout}
            className="w-full flex items-center px-4 py-3 text-base font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
          >
            <i className="ri-logout-box-line text-xl mr-3"></i>
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
