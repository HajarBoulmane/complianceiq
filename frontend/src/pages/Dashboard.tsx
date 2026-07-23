  import { useEffect, useState } from "react";
  import { Link, useNavigate } from "react-router-dom";
  import {
    AreaChart,
    Area,
    XAxis,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
  } from "recharts";
  import { logoutUser } from "../api/auth";
  import { getDashboardStats } from "../api/compliance";
  import type { DashboardStats } from "../api/compliance";
  import { useAuth } from "../context/authContext";
  import { useTheme } from "../context/themeContext";
  import {
    MessageSquareText,
    FileSearch,
    LogOut,
    LayoutDashboard,
    Settings,
    AlertCircle,
    FileText,
    Sun,
    Moon,
    Bell,
  } from "lucide-react";

  const DONUT_COLORS = ["#EC4899", "#8B5CF6", "#F97316"];

  export default function Dashboard() {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      getDashboardStats()
        .then(setStats)
        .catch((err) => console.error("Erreur chargement stats:", err))
        .finally(() => setLoading(false));
    }, []);

    const handleLogout = async () => {
      await logoutUser();
      setUser(null);
      navigate("/login");
    };

    const conformiteData = stats
      ? [
          { name: "Conforme", value: stats.conformeCount },
          { name: "À vérifier", value: stats.moyenCount },
          { name: "À risque", value: stats.risqueCount },
        ]
      : [];

    const statCards = stats
      ? [
          { label: "Documents analysés", value: stats.totalDocuments, color: "from-pink-500 to-pink-600" },
          { label: "Conversations", value: stats.conversationsCount, color: "from-violet-500 to-violet-600" },
          { label: "Score moyen", value: `${stats.avgScore}%`, color: "from-blue-500 to-blue-600" },
          { label: "Risques critiques", value: stats.recentHighRisks.length, color: "from-orange-500 to-orange-600" },
        ]
      : [];

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
            <a className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 font-medium text-sm">
              <LayoutDashboard size={18} />
              Dashboard
            </a>
            <Link
              to="/ask"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition text-sm"
            >
              <MessageSquareText size={18} />
              Poser une question
            </Link>
            <Link
              to="/analyze"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition text-sm"
            >
              <FileSearch size={18} />
              Analyser un contrat
            </Link>
            <a className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition text-sm">
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
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                Bienvenue, {user?.fullName?.split(" ")[0]}
              </h2>
            </div>
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

          <div className="flex-1 p-8 overflow-y-auto">
            {loading && (
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                Chargement des statistiques...
              </div>
            )}

            {stats && (
              <>
                {/* Row 1: Dashboard summary card (like the Lector top panel) */}
                <div className="bg-white dark:bg-[#1A1420] rounded-2xl p-6 mb-5 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
                        Score de conformité global
                      </p>
                      <p className="font-heading text-3xl font-bold text-slate-900 dark:text-white">
                        {stats.avgScore}%
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        {stats.totalDocuments} document{stats.totalDocuments !== 1 ? "s" : ""} analysé{stats.totalDocuments !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-6 items-center">
                    <ResponsiveContainer width="70%" height={100}>
                      <AreaChart data={stats.monthlyActivity}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EC4899" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="month"
                          tick={{ fill: "#94A3B8", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            border: "1px solid #E2E8F0",
                            borderRadius: 8,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="#EC4899"
                          strokeWidth={2}
                          fill="url(#colorCount)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>

                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width={90} height={90}>
                        <PieChart>
                          <Pie
                            data={conformiteData}
                            dataKey="value"
                            innerRadius={28}
                            outerRadius={42}
                            stroke="none"
                          >
                            {conformiteData.map((_, i) => (
                              <Cell key={i} fill={DONUT_COLORS[i]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5">
                        {conformiteData.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: DONUT_COLORS[i] }}
                            />
                            <span className="text-slate-500 dark:text-slate-400">{item.name}</span>
                            <span className="text-slate-900 dark:text-white font-medium">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: 4 colored stat cards */}
                <div className="grid grid-cols-4 gap-4 mb-5">
                  {statCards.map((card, i) => (
                    <div
                      key={i}
                      className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 text-white shadow-sm`}
                    >
                      <p className="text-white/80 text-xs mb-2">{card.label}</p>
                      <p className="font-heading text-2xl font-bold">{card.value}</p>
                    </div>
                  ))}
                </div>

                {/* Row 3: Recent activity + table */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#1A1420] rounded-2xl p-6 shadow-sm">
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-4">
                      Derniers contrats analysés
                    </p>
                    {stats.recentDocuments.length > 0 ? (
                      <div className="space-y-3">
                        {stats.recentDocuments.map((doc) => (
                          <Link
                            key={doc.id}
                            to={`/analyze?documentId=${doc.id}`}
                            className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg p-2 -m-2 transition"
                          >
                            <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center shrink-0">
                              <FileText size={14} className="text-pink-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-700 dark:text-slate-200 text-sm truncate">
                                {doc.filename || `Document #${doc.id}`}
                              </p>
                              <p className="text-slate-400 text-xs">
                                {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                              </p>
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 rounded-full shrink-0 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
                              {doc.score}%
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm">Aucun contrat analysé pour l'instant</p>
                    )}
                  </div>

                  <div className="bg-white dark:bg-[#1A1420] rounded-2xl p-6 shadow-sm">
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-4">
                      Risques critiques récents
                    </p>
                    {stats.recentHighRisks.length > 0 ? (
                      <div className="space-y-3">
                        {stats.recentHighRisks.map((risk, i) => (
                          <div key={i} className="flex gap-2">
                            <AlertCircle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-slate-700 dark:text-slate-200 text-sm truncate">{risk.clause}</p>
                              <p className="text-slate-400 text-xs truncate">
                                {risk.documentFilename || `Document #${risk.documentId}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm">Aucun risque critique détecté</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {!loading && !stats && (
              <div className="bg-white dark:bg-[#1A1420] rounded-2xl p-8 text-center shadow-sm">
                <p className="text-slate-400 text-sm mb-4">
                  Aucune donnée disponible pour l'instant
                </p>
                <Link
                  to="/analyze"
                  className="inline-block bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90 text-white font-semibold px-5 py-2.5 rounded-xl transition"
                >
                  Analyser votre premier contrat
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }