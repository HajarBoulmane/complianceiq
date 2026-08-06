import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/Layout";
import { getNotifications, markNotificationRead } from "../api/compliance";
import type { NotificationItem } from "../api/compliance";
import {
 
  Check,
  ArrowRight,
  Clock,
  FileText,
} from "lucide-react";

/* ── Minimal accent ── */


function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
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
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error("Erreur marquage notification:", err);
      const res = await getNotifications(filter === "unread");
      setNotifications(res.notifications);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await Promise.all(unreadIds.map((id) => markNotificationRead(id)));
    } catch (err) {
      console.error("Erreur marquage notifications:", err);
      const res = await getNotifications(filter === "unread");
      setNotifications(res.notifications);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header — clean, no icon blob */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Notifications
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {unreadCount > 0
                ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                : "Tout est à jour"}
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition pb-0.5"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>

        {/* Filters — minimal pill tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-100 dark:border-white/5 pb-px">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-2 text-sm font-medium transition relative ${
              filter === "all"
                ? "text-slate-900 dark:text-white"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            Toutes
            {filter === "all" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 dark:bg-white rounded-full" />
            )}
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-3 py-2 text-sm font-medium transition relative ${
              filter === "unread"
                ? "text-slate-900 dark:text-white"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            Non lues
            {unreadCount > 0 && filter !== "unread" && (
              <span className="ml-1.5 text-[10px] text-slate-400">
                {unreadCount}
              </span>
            )}
            {filter === "unread" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 dark:bg-white rounded-full" />
            )}
          </button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-4 py-4 px-1 animate-pulse"
              >
                <div className="w-2 h-2 rounded-full bg-slate-100 dark:bg-white/5 mt-2 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-100 dark:bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 dark:bg-white/5 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state — no icons, just typography */}
        {!loading && notifications.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-slate-900 dark:text-white font-medium text-sm">
              {filter === "unread"
                ? "Aucune notification non lue"
                : "Aucune notification"}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              {filter === "unread"
                ? "Vous avez tout lu."
                : "Les alertes apparaîtront ici."}
            </p>
          </div>
        )}

        {/* Notification list — minimal, text-driven */}
        {!loading && notifications.length > 0 && (
          <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`group flex items-start gap-4 py-4 px-1 -mx-1 rounded-xl transition ${
                  n.read
                    ? "opacity-50 hover:opacity-100"
                    : "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                }`}
              >
                {/* Unread dot — tiny, subtle */}
                <div className="shrink-0 pt-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      n.read ? "bg-transparent" : "bg-pink-500"
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm leading-relaxed ${
                      n.read
                        ? "text-slate-500 dark:text-slate-400"
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {n.message}
                  </p>

                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-slate-400 tabular-nums flex items-center gap-1">
                      <Clock size={10} />
                      {timeAgo(n.createdAt)}
                    </span>

                    {n.documentId && (
                      <Link
                        to={`/analyze?documentId=${n.documentId}`}
                        className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 transition flex items-center gap-0.5"
                      >
                        <FileText size={10} />
                        Contrat
                        <ArrowRight size={10} />
                      </Link>
                    )}
                  </div>
                </div>

                {!n.read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    title="Marquer comme lu"
                    className="shrink-0 p-1.5 text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 transition opacity-0 group-hover:opacity-100"
                  >
                    <Check size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}