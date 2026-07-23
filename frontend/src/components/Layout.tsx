import { type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logoutUser } from "../api/auth";
import { useAuth } from "../context/authContext";
import { useTheme } from "../context/themeContext";
import {
  MessageSquareText,
  FileSearch,
  LogOut,
  LayoutDashboard,
  Settings,
  Sun,
  Moon,
  Bell,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ask", label: "Poser une question", icon: MessageSquareText },
  { to: "/analyze", label: "Analyser un contrat", icon: FileSearch },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-navy dark:bg-navy-dark flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-[#1A1420] flex flex-col shadow-sm">
        <div className="bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <LayoutDashboard size={16} className="text-white" />
          </div>
          <h1 className="font-heading text-lg font-bold text-white">
            Compliance<span className="opacity-90">IQ</span>
          </h1>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                  isActive
                    ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 font-medium"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition text-sm cursor-pointer">
            <Settings size={18} />
            Paramètres
          </a>
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 mx-4 mb-4 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition text-sm"
        >
          <LogOut size={18} />
          Déconnexion
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="bg-white dark:bg-[#1A1420] px-8 py-4 flex items-center justify-between shadow-sm">
          <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
            Bienvenue, {user?.fullName?.split(" ")[0]}
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition">
              <Bell size={18} />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
              {user?.fullName?.[0]?.toUpperCase() || "U"}
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}