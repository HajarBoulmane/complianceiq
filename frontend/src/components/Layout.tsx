import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logoutUser } from "../api/auth";
import { getNotifications } from "../api/compliance";
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
  HelpCircle,
  ChevronDown,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ask", label: "Poser une question", icon: MessageSquareText },
  { to: "/analyze", label: "Analyser un contrat", icon: FileSearch },
];

const SECONDARY_NAV_ITEMS = [{ to: "/parametres", label: "Paramètres", icon: Settings }];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    getNotifications(true)
      .then((res) => setUnreadCount(res.notifications.length))
      .catch((err) => console.error("Erreur chargement notifications:", err));
  }, [location.pathname]);

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-navy dark:bg-navy-dark flex">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-64 shrink-0 bg-white dark:bg-[#1A1420] flex-col shadow-sm h-screen sticky top-0">
        <div className="bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <LayoutDashboard size={16} className="text-white" />
          </div>
          <h1 className="font-heading text-lg font-bold text-white">
            Compliance<span className="opacity-90">IQ</span>
          </h1>
        </div>

        <nav className="space-y-1 p-4">
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
          <Link
            to="/notifications"
            className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
              location.pathname === "/notifications"
                ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 font-medium"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span className="flex items-center gap-3">
              <Bell size={18} />
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          {SECONDARY_NAV_ITEMS.map(({ to, label, icon: Icon }) => {
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
        </nav>

        {/* Fills the space so the sidebar doesn't look empty + gives quick account context */}
        <div className="flex-1 flex flex-col justify-end gap-3 px-4 pb-4">
          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.fullName?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-slate-700 dark:text-slate-200 text-xs font-medium truncate">
                {user?.fullName || "Utilisateur"}
              </p>
              <p className="text-slate-400 text-[11px] truncate">{user?.email}</p>
            </div>
          </div>

          <a
            href="mailto:support@complianceiq.local"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition text-xs"
          >
            <HelpCircle size={16} />
            Besoin d'aide ?
          </a>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 mx-4 mb-4 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition text-sm"
        >
          <LogOut size={18} />
          Déconnexion
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top bar */}
        <div className="bg-white dark:bg-[#1A1420] px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
          <h2 className="font-heading text-base md:text-lg font-bold text-slate-900 dark:text-white truncate">
            Bienvenue, {user?.fullName?.split(" ")[0]}
          </h2>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link
              to="/notifications"
              className="relative p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-pink-500" />
              )}
            </Link>

            {/* Profile — hover dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setProfileOpen(true)}
              onMouseLeave={() => setProfileOpen(false)}
            >
              <button className="flex items-center gap-1.5 group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                  {user?.fullName?.[0]?.toUpperCase() || "U"}
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform hidden md:block ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full pt-2 w-52 z-20">
                  <div className="bg-white dark:bg-[#1A1420] border border-slate-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5">
                      <p className="text-slate-900 dark:text-white text-sm font-medium truncate">
                        {user?.fullName || "Utilisateur"}
                      </p>
                      <p className="text-slate-400 text-xs truncate">{user?.email}</p>
                    </div>
                    <Link
                      to="/parameters"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition"
                    >
                      <Settings size={15} />
                      Paramètres
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                    >
                      <LogOut size={15} />
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1A1420] border-t border-slate-200 dark:border-white/10 flex items-center justify-around py-2 z-10">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                isActive ? "text-pink-600 dark:text-pink-400" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px]">{label.split(" ")[0]}</span>
            </Link>
          );
        })}
        <Link
          to="/notifications"
          className={`relative flex flex-col items-center gap-0.5 px-3 py-1 ${
            location.pathname === "/notifications"
              ? "text-pink-600 dark:text-pink-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-pink-500" />
          )}
          <span className="text-[10px]">Notifs</span>
        </Link>
      </nav>
    </div>
  );
}