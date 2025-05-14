import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
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
      <a
        className={cn(
          "flex items-center px-4 py-3 text-base font-medium rounded-lg",
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
      </a>
    </Link>
  );
};

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const { user, logout } = useAuth();

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
            <div className="flex items-center justify-center text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white w-10 h-10 rounded-md">
              SNP
            </div>
          </div>
          <span className="ml-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Client Portal
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
        <SidebarNavItem href="/" icon="ri-dashboard-line" label="Dashboard" />
        <SidebarNavItem
          href="/weight-tracking"
          icon="ri-scales-3-line"
          label="Weight Tracking"
        />
        <SidebarNavItem
          href="/progress-photos"
          icon="ri-image-line"
          label="Progress Photos"
        />
        <SidebarNavItem
          href="/checkins"
          icon="ri-calendar-check-line"
          label="Check-ins"
        />
        <SidebarNavItem
          href="/messages"
          icon="ri-message-3-line"
          label="Messages"
          badge={3}
        />
        <SidebarNavItem
          href="/meal-plans"
          icon="ri-restaurant-line"
          label="Meal Plans"
        />

        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
          <a
            href="#"
            className="flex items-center px-4 py-3 text-base font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <i className="ri-settings-4-line text-xl mr-3"></i>
            <span>Settings</span>
          </a>
          <button
            onClick={logout}
            className="w-full flex items-center px-4 py-3 text-base font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <i className="ri-logout-box-line text-xl mr-3"></i>
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
