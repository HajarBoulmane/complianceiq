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

const DONUT_COLORS = ["#EC4899", "#8B5CF6", "#F97316"];
const CATEGORY_COLORS = [
  "#EC4899",
  "#8B5CF6",
  "#F97316",
  "#3B82F6",
  "#F59E0B",
  "#22C55E",
];
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
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
};

const CARD =
  "bg-white dark:bg-[#16121f] rounded-2xl border border-slate-100 dark:border-white/[0.04]";

function daysUntil(dueDate: string) {
  return Math.ceil(
    (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
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

  // Valeurs par défaut si stats est null (erreur ou chargement)
  const safeStats: DashboardStats = stats ?? {
    avgScore: 0,
    totalDocuments: 0,
    conformeCount: 0,
    moyenCount: 0,
    risqueCount: 0,
    monthlyActivity: [],
    categoriesAvg: [],
    recentDocuments: [],
    recentHighRisks: [],
    conversationsCount: 0,
  };

  const conformiteData = [
    { name: "Conforme", value: safeStats.conformeCount },
    { name: "À vérifier", value: safeStats.moyenCount },
    { name: "À risque", value: safeStats.risqueCount },
  ];

  const sortedObligations = [...obligations].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const urgentObligationsCount = obligations.filter(
    (ob) => ob.dueDate && daysUntil(ob.dueDate) < 14
  ).length;

  const hoursSaved =
    Math.round((safeStats.totalDocuments * REVIEW_TIME_MINUTES_PER_DOC) / 6) /
    10;

  const problemsByCategory = [...safeStats.categoriesAvg].sort(
    (a, b) => b.nb_problemes - a.nb_problemes
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {loading && (
          <div className="flex items-center gap-3 text-slate-400 text-sm mb-6">
            <div className="w-4 h-4 border-2 border-slate-300 dark:border-white/20 border-t-transparent rounded-full animate-spin" />
            Chargement...
          </div>
        )}

        {/* Hero row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Score + chart */}
          <div className={`${CARD} p-5 lg:col-span-2`}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-slate-400 text-[11px] uppercase tracking-wider font-medium mb-1">
                  Score de conformité global
                </p>
                <p className="text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
                  {safeStats.avgScore}%
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  {safeStats.totalDocuments} document
                  {safeStats.totalDocuments !== 1 ? "s" : ""} analysé
                  {safeStats.totalDocuments !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-end">
              <div className="flex-1 w-full h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={safeStats.monthlyActivity}>
                    <defs>
                      <linearGradient
                        id="colorCount"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#EC4899"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#EC4899"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#94A3B8", fontSize: 11 }}
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
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <ResponsiveContainer width={80} height={80}>
                  <PieChart>
                    <Pie
                      data={conformiteData}
                      dataKey="value"
                      innerRadius={26}
                      outerRadius={38}
                      stroke="none"
                      paddingAngle={2}
                    >
                      {conformiteData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {conformiteData.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: DONUT_COLORS[i],
                        }}
                      />
                      <span className="text-slate-500 dark:text-slate-400">
                        {item.name}
                      </span>
                      <span className="text-slate-900 dark:text-white font-medium tabular-nums ml-auto">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick metrics column */}
          <div className="space-y-3">
            {[
              { label: "Score moyen", value: `${safeStats.avgScore}%` },
              {
                label: "Contrats à risque",
                value: safeStats.risqueCount,
                alert: safeStats.risqueCount > 0,
              },
              { label: "Temps économisé", value: `${hoursSaved}h` },
              {
                label: "Échéances <14j",
                value: urgentObligationsCount,
                alert: urgentObligationsCount > 0,
              },
            ].map((m, i) => (
              <div
                key={i}
                className={`${CARD} p-4 flex items-center justify-between`}
              >
                <div>
                  <p className="text-slate-400 text-[11px] uppercase tracking-wider font-medium">
                    {m.label}
                  </p>
                  <p
                    className={`text-lg font-semibold tabular-nums ${
                      m.alert
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {m.value}
                  </p>
                </div>
              </div>
            ))}
            <p className="text-slate-400 text-[10px] px-1">
              * Estimation basée sur {REVIEW_TIME_MINUTES_PER_DOC} min de
              révision manuelle par contrat
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className={`${CARD} p-5`}>
            <p className="text-slate-400 text-[11px] uppercase tracking-wider font-medium mb-5">
              Score par catégorie
            </p>
            {safeStats.categoriesAvg.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={safeStats.categoriesAvg} outerRadius="75%">
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis
                    dataKey="nom"
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#8B5CF6"
                    fill="#8B5CF6"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
                Pas assez de données
              </div>
            )}
          </div>

          <div className={`${CARD} p-5`}>
            <p className="text-slate-400 text-[11px] uppercase tracking-wider font-medium mb-5">
              Problèmes par catégorie
            </p>
            {problemsByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={problemsByCategory}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                >
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="nom"
                    width={120}
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="nb_problemes" radius={[0, 4, 4, 0]} barSize={14}>
                    {problemsByCategory.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
                Pas assez de données
              </div>
            )}
          </div>
        </div>

        {/* Lists */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recent docs */}
          <div className={`${CARD} p-5`}>
            <p className="text-slate-400 text-[11px] uppercase tracking-wider font-medium mb-4">
              Derniers contrats
            </p>
            {safeStats.recentDocuments.length > 0 ? (
              <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                {safeStats.recentDocuments.map((doc) => (
                  <Link
                    key={doc.id}
                    to={`/analyze?documentId=${doc.id}`}
                    className="flex items-center gap-3 py-3 -mx-1 px-1 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.02] transition group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 dark:text-slate-200 text-sm font-medium truncate">
                        {doc.filename || `Document #${doc.id}`}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        (doc.score ?? 0) < 40
                          ? "text-red-600 dark:text-red-400"
                          : (doc.score ?? 0) < 70
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {doc.score}%
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm py-4">
                Aucun document analysé
              </p>
            )}
          </div>

          {/* Obligations */}
          <div className={`${CARD} p-5`}>
            <p className="text-slate-400 text-[11px] uppercase tracking-wider font-medium mb-4">
              Échéances
            </p>
            {sortedObligations.length > 0 ? (
              <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                {sortedObligations.slice(0, 4).map((ob) => {
                  const days = ob.dueDate ? daysUntil(ob.dueDate) : null;
                  const isUrgent = days !== null && days < 14;
                  return (
                    <div key={ob.id} className="py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 dark:text-slate-200 text-sm font-medium">
                          {OBLIGATION_LABELS[ob.type] ?? ob.type}
                        </p>
                        <p className="text-slate-400 text-xs truncate">
                          {ob.description}
                        </p>
                        {days !== null && (
                          <p
                            className={`text-[11px] mt-1 font-medium tabular-nums ${
                              isUrgent ? "text-red-500" : "text-slate-400"
                            }`}
                          >
                            {days} jour{days !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 text-sm py-4">Aucune échéance</p>
            )}
          </div>

          {/* High risks */}
          <div className={`${CARD} p-5`}>
            <p className="text-slate-400 text-[11px] uppercase tracking-wider font-medium mb-4">
              Risques majeurs
            </p>
            {safeStats.recentHighRisks.length > 0 ? (
              <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                {safeStats.recentHighRisks.slice(0, 3).map((risk, i) => (
                  <div key={i} className="py-3">
                    <p className="text-slate-700 dark:text-slate-200 text-sm font-medium truncate">
                      {risk.clause}
                    </p>
                    <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed mt-0.5">
                      {risk.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm py-4">
                Aucun risque majeur
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}