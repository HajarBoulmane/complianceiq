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

/* ── Accent tokens: one coherent family from pink → violet ── */
const ACCENT = {
  // The gradient stops used everywhere
  from: "#EC4899", // pink-500
  to: "#7C3AED",   // violet-600 (slightly deeper than 500 for elegance)
  
  // Derived flat tints for UI surfaces
  light: "bg-pink-50 dark:bg-pink-500/[0.08]",
  text: "text-pink-600 dark:text-pink-400",
  border: "border-pink-100 dark:border-pink-500/20",
  badge: "bg-pink-500",
};

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

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#f8f7fb] dark:bg-[#0a0614] flex transition-colors duration-300">
      {/* ═══════════════════════════════════════
          SIDEBAR — tinted background so the
          gradient header doesn't float in space
         ═══════════════════════════════════════ */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col h-screen sticky top-0
        bg-[#fdf8fb] dark:bg-[#16121f]
        border-r border-pink-100/60 dark:border-white/[0.05]">
        
        {/* Header — softer gradient, rounded bottom to feel "attached" */}
        <div
          className="mx-3 mt-3 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-sm shadow-pink-500/10"
          style={{ background: `linear-gradient(135deg, ${ACCENT.from}, ${ACCENT.to})` }}
        >
          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <LayoutDashboard size={16} className="text-white" />
          </div>
          <h1 className="font-heading text-lg font-bold text-white tracking-tight">
            Compliance<span className="opacity-80 font-medium">IQ</span>
          </h1>
        </div>

        {/* Navigation */}
        <nav className="space-y-0.5 p-3 mt-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? `${ACCENT.light} ${ACCENT.text}`
                    : "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}

          <Link
            to="/notifications"
            className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive("/notifications")
                ? `${ACCENT.light} ${ACCENT.text}`
                : "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span className="flex items-center gap-3">
              <Bell size={18} strokeWidth={isActive("/notifications") ? 2.5 : 2} />
              Notifications
            </span>
            {unreadCount > 0 && (
              <span
                className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm"
                style={{ backgroundColor: ACCENT.from }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          <div className="my-2 border-t border-pink-100/60 dark:border-white/5" />

          {SECONDARY_NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? `${ACCENT.light} ${ACCENT.text}`
                    : "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User card — same gradient as header for perfect harmony */}
        <div className="flex-1 flex flex-col justify-end gap-2 px-3 pb-3">
          <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-3 flex items-center gap-3 border border-pink-100/60 dark:border-white/[0.06] shadow-sm">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
              style={{ background: `linear-gradient(135deg, ${ACCENT.from}, ${ACCENT.to})` }}
            >
              {user?.fullName?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-slate-700 dark:text-slate-200 text-xs font-semibold truncate">
                {user?.fullName || "Utilisateur"}
              </p>
              <p className="text-slate-400 text-[11px] truncate">{user?.email}</p>
            </div>
          </div>

          <a
            href="mailto:support@complianceiq.local"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300 transition text-xs font-medium"
          >
            <HelpCircle size={16} />
            Besoin d'aide ?
          </a>
        </div>

        {/* Logout — softer red that doesn't clash with pink */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 mx-3 mb-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-all duration-200 text-sm font-medium"
        >
          <LogOut size={18} />
          Déconnexion
        </button>
      </aside>

      {/* ═══════════════════════════════════════
          MAIN CONTENT
         ═══════════════════════════════════════ */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top bar */}
        <div className="bg-white dark:bg-[#16121f] px-4 md:px-8 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] sticky top-0 z-10">
          <h2 className="font-heading text-base md:text-lg font-bold text-slate-900 dark:text-white truncate">
            Bienvenue, {user?.fullName?.split(" ")[0]}
          </h2>
          <div className="flex items-center gap-1 md:gap-3 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all duration-200"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link
              to="/notifications"
              className="relative p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all duration-200"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-[#16121f]"
                  style={{ backgroundColor: ACCENT.from }}
                />
              )}
            </Link>

            {/* Profile dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setProfileOpen(true)}
              onMouseLeave={() => setProfileOpen(false)}
            >
              <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${ACCENT.from}, ${ACCENT.to})` }}
                >
                  {user?.fullName?.[0]?.toUpperCase() || "U"}
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform duration-200 hidden md:block ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full pt-2 w-56 z-20">
                  <div className="bg-white dark:bg-[#1e1a2e] border border-slate-100 dark:border-white/10 rounded-2xl shadow-xl shadow-black/5 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5">
                      <p className="text-slate-900 dark:text-white text-sm font-semibold truncate">
                        {user?.fullName || "Utilisateur"}
                      </p>
                      <p className="text-slate-400 text-xs truncate">{user?.email}</p>
                    </div>
                    <Link
                      to="/parametres"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <Settings size={15} />
                      Paramètres
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#16121f]/80 backdrop-blur-lg border-t border-slate-200 dark:border-white/10 flex items-center justify-around py-2 z-50">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                active ? "text-pink-600 dark:text-pink-400" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label.split(" ")[0]}</span>
            </Link>
          );
        })}
        <Link
          to="/notifications"
          className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
            isActive("/notifications")
              ? "text-pink-600 dark:text-pink-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span
              className="absolute top-0 right-2 w-2 h-2 rounded-full ring-2 ring-white dark:ring-[#16121f]"
              style={{ backgroundColor: ACCENT.from }}
            />
          )}
          <span className="text-[10px] font-medium">Notifs</span>
        </Link>
      </nav>
    </div>
  );
}