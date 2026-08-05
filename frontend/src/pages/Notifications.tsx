import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/Layout";
import { getNotifications, markNotificationRead } from "../api/compliance";
import type { NotificationItem } from "../api/compliance";
import { CalendarClock, CreditCard, FileEdit, Bell, Check } from "lucide-react";

const TYPE_CONFIG: Record<
  NotificationItem["type"],
  { icon: typeof Bell; color: string; bg: string }
> = {
  RENEWAL_DUE: {
    icon: CalendarClock,
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-500/10",
  },
  PAYMENT_DUE: {
    icon: CreditCard,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-500/10",
  },
  CLAUSE_SUGGESTED: {
    icon: FileEdit,
    color: "text-pink-500",
    bg: "bg-pink-50 dark:bg-pink-500/10",
  },
};

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await getNotifications(filter === "unread");
        setNotifications(res.notifications);
      } catch (err) {
        console.error("Erreur chargement notifications:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [filter]);

  const handleMarkRead = async (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error("Erreur marquage notification:", err);
      const res = await getNotifications(filter === "unread");
      setNotifications(res.notifications);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center shrink-0">
            <Bell className="text-pink-500" size={20} />
          </div>
          <h1 className="font-heading text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
            Notifications
          </h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Échéances, renouvellements et reformulations de clauses détectées automatiquement
        </p>

        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === "all"
                ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white"
                : "bg-white dark:bg-[#1A1420] border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
              filter === "unread"
                ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white"
                : "bg-white dark:bg-[#1A1420] border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Non lues
            {unreadCount > 0 && filter !== "unread" && (
              <span className="bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            Chargement...
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="bg-white dark:bg-[#1A1420] rounded-2xl p-8 text-center shadow-sm">
            <Bell className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={28} />
            <p className="text-slate-400 text-sm">
              {filter === "unread" ? "Aucune notification non lue" : "Aucune notification pour l'instant"}
            </p>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((n) => {
              const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.CLAUSE_SUGGESTED;
              const Icon = config.icon;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 rounded-xl p-4 shadow-sm transition ${
                    n.read
                      ? "bg-white dark:bg-[#1A1420] opacity-70"
                      : "bg-white dark:bg-[#1A1420] border-l-4 border-pink-500"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={16} className={config.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 dark:text-slate-200 text-sm">{n.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-slate-400 text-xs">{timeAgo(n.createdAt)}</p>
                      {n.documentId && (
                        <Link
                          to={`/analyze?documentId=${n.documentId}`}
                          className="text-pink-600 dark:text-pink-400 text-xs font-medium hover:underline"
                        >
                          Voir le contrat
                        </Link>
                      )}
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      title="Marquer comme lu"
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-pink-500 transition shrink-0"
                    >
                      <Check size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}