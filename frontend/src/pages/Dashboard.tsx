import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { getDashboardStats, getUpcomingObligations } from "../api/compliance";
import type { DashboardStats, Obligation } from "../api/compliance";
import AppLayout from "../components/Layout";
import {
  AlertTriangle,
  FileText,
  Clock,
  CalendarClock,
  TrendingUp,
} from "lucide-react";

const DONUT_COLORS = ["#EC4899", "#8B5CF6", "#F97316"];
const CATEGORY_COLORS = ["#EC4899", "#8B5CF6", "#F97316", "#3B82F6", "#F59E0B", "#22C55E"];
const REVIEW_TIME_MINUTES_PER_DOC = 30;

const OBLIGATION_LABELS: Record<string, string> = {
  RENEWAL: "Renouvellement",
  PAYMENT: "Paiement",
  NOTICE: "Préavis",
  OTHER: "Autre",
};

const TOOLTIP_STYLE = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
};

function daysUntil(dueDate: string) {
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err) => console.error("Erreur chargement stats:", err))
      .finally(() => setLoading(false));

    getUpcomingObligations(30)
      .then((res) => setObligations(res.obligations))
      .catch((err) => console.error("Erreur chargement obligations:", err));
  }, []);

  const conformiteData = stats
    ? [
        { name: "Conforme", value: stats.conformeCount },
        { name: "À vérifier", value: stats.moyenCount },
        { name: "À risque", value: stats.risqueCount },
      ]
    : [];

  const sortedObligations = [...obligations].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const urgentObligationsCount = obligations.filter(
    (ob) => ob.dueDate && daysUntil(ob.dueDate) < 14
  ).length;

  const hoursSaved = stats
    ? Math.round((stats.totalDocuments * REVIEW_TIME_MINUTES_PER_DOC) / 6) / 10
    : 0;

  const problemsByCategory = stats
    ? [...stats.categoriesAvg].sort((a, b) => b.nb_problemes - a.nb_problemes)
    : [];

  const statCards = stats
    ? [
        {
          label: "Score moyen de conformité",
          value: `${stats.avgScore}%`,
          color: "from-blue-500 to-blue-600",
          icon: TrendingUp,
        },
        {
          label: "Contrats à risque élevé",
          value: stats.risqueCount,
          color: stats.risqueCount > 0 ? "from-red-500 to-red-600" : "from-slate-400 to-slate-500",
          icon: AlertTriangle,
        },
        {
          label: "Temps de révision économisé*",
          value: `${hoursSaved}h`,
          color: "from-violet-500 to-violet-600",
          icon: Clock,
        },
        {
          label: "Échéances urgentes (<14j)",
          value: urgentObligationsCount,
          color:
            urgentObligationsCount > 0
              ? "from-orange-500 to-orange-600"
              : "from-slate-400 to-slate-500",
          icon: CalendarClock,
        },
      ]
    : [];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {loading && (
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            Chargement des statistiques...
          </div>
        )}

        {stats && (
          <>
            <div className="bg-white dark:bg-[#1A1420] rounded-2xl p-4 md:p-6 mb-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
                    Score de conformité global
                  </p>
                  <p className="font-heading text-3xl font-bold text-slate-900 dark:text-white">
                    {stats.avgScore}%
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    {stats.totalDocuments} document{stats.totalDocuments !== 1 ? "s" : ""} analysé
                    {stats.totalDocuments !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-center">
                <ResponsiveContainer width="100%" height={100} className="md:!w-[70%]">
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
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
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
                        <span className="text-slate-900 dark:text-white font-medium">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-1">
              {statCards.map((card, i) => (
                <div
                  key={i}
                  className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 md:p-5 text-white shadow-sm`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white/80 text-xs">{card.label}</p>
                    <card.icon size={16} className="text-white/60" />
                  </div>
                  <p className="font-heading text-xl md:text-2xl font-bold">{card.value}</p>
                </div>
              ))}
            </div>
            <p className="text-slate-400 text-[10px] mb-5">
              * Estimation basée sur {REVIEW_TIME_MINUTES_PER_DOC} min de révision manuelle par
              contrat
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="bg-white dark:bg-[#1A1420] rounded-2xl p-4 md:p-6 shadow-sm">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-4">
                  Score par catégorie de conformité
                </p>
                {stats.categoriesAvg.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={stats.categoriesAvg} outerRadius="75%">
                      <PolarGrid stroke="#E2E8F0" />
                      <PolarAngleAxis dataKey="nom" tick={{ fill: "#94A3B8", fontSize: 10 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="#8B5CF6"
                        fill="#8B5CF6"
                        fillOpacity={0.35}
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-sm">Pas assez de données pour l'instant</p>
                )}
              </div>

              <div className="bg-white dark:bg-[#1A1420] rounded-2xl p-4 md:p-6 shadow-sm">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-4">
                  Problèmes détectés par catégorie
                </p>
                {problemsByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={problemsByCategory} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fill: "#94A3B8", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="nom"
                        width={130}
                        tick={{ fill: "#94A3B8", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="nb_problemes" radius={[0, 6, 6, 0]} barSize={16}>
                        {problemsByCategory.map((_, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-sm">Pas assez de données pour l'instant</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-[#1A1420] rounded-2xl p-4 md:p-6 shadow-sm">
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
                  <p className="text-slate-400 text-sm">Aucun document analysé pour le moment</p>
                )}
              </div>

              <div className="bg-white dark:bg-[#1A1420] rounded-2xl p-4 md:p-6 shadow-sm">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-4">
                  Échéances à surveiller
                </p>
                {sortedObligations.length > 0 ? (
                  <div className="space-y-3">
                    {sortedObligations.slice(0, 4).map((ob) => (
                      <div key={ob.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
                          <CalendarClock size={14} className="text-violet-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-slate-700 dark:text-slate-200 text-sm truncate">
                            {OBLIGATION_LABELS[ob.type] ?? ob.type}
                          </p>
                          <p className="text-slate-400 text-xs truncate">{ob.description}</p>
                          {ob.dueDate && (
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">
                              {daysUntil(ob.dueDate)} jour{daysUntil(ob.dueDate) !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">Aucune échéance détectée</p>
                )}
              </div>

              <div className="bg-white dark:bg-[#1A1420] rounded-2xl p-4 md:p-6 shadow-sm">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-4">
                  Risques majeurs récents
                </p>
                {stats.recentHighRisks.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentHighRisks.slice(0, 3).map((risk, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                          <AlertTriangle size={14} className="text-red-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-slate-700 dark:text-slate-200 text-sm truncate">
                            {risk.clause}
                          </p>
                          <p className="text-slate-400 text-xs line-clamp-2">{risk.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">Aucun risque majeur détecté</p>
                )}
              </div>
            </div>
          </>)}
      </div>
    </AppLayout>
  );
}