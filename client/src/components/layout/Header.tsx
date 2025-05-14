import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  title: string;
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ title, setSidebarOpen }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-slate-800 shadow-sm py-4 px-6 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>
          <h1 className="ml-4 text-xl font-bold text-primary">SNP Client Portal</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <i
              className={theme === "dark" ? "ri-sun-line" : "ri-moon-line"}
              style={{ fontSize: "1.25rem" }}
            ></i>
          </button>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40"
              alt="User avatar"
              className="w-8 h-8 rounded-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <header className="hidden md:flex h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <i
              className={theme === "dark" ? "ri-sun-line" : "ri-moon-line"}
              style={{ fontSize: "1.25rem" }}
            ></i>
          </button>
          <div className="relative">
            <button className="flex items-center space-x-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {user?.firstName} {user?.lastName}
              </span>
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40"
                alt="User avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
