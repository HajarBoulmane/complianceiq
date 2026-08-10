import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  analyzeContract,
  getDocumentAnalysis,
  mapDocumentToAnalysis,
} from "../api/compliance";
import type { ContractAnalysis, Severity } from "../api/compliance";
import { extractTextFromPdf } from "../utils/pdfExtract";
import AppLayout from "../components/Layout";
import {
  Upload,
  FileText,
  X,
  Copy,
  Check,
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  Shield,
  FileCheck,
  Sparkles,
  Calendar,
  RefreshCcw,
} from "lucide-react";

/* ── Severity tokens ── */
const SEVERITY_STYLES: Record<
  string,
  { color: string; label: string; border: string; bg: string; icon: React.ReactNode }
> = {
  CRITICAL: {
    color: "text-red-700 dark:text-red-400",
    label: "Critique",
    border: "border-l-red-500",
    bg: "bg-red-50 dark:bg-red-500/[0.06]",
    icon: <ShieldAlert size={14} className="text-red-500" />,
  },
  HIGH: {
    color: "text-orange-700 dark:text-orange-400",
    label: "Haute",
    border: "border-l-orange-500",
    bg: "bg-orange-50 dark:bg-orange-500/[0.06]",
    icon: <AlertTriangle size={14} className="text-orange-500" />,
  },
  MEDIUM: {
    color: "text-amber-700 dark:text-amber-400",
    label: "Moyenne",
    border: "border-l-amber-500",
    bg: "bg-amber-50 dark:bg-amber-500/[0.06]",
    icon: <AlertTriangle size={14} className="text-amber-500" />,
  },
  LOW: {
    color: "text-slate-600 dark:text-slate-400",
    label: "Basse",
    border: "border-l-slate-400",
    bg: "bg-slate-50 dark:bg-slate-400/[0.06]",
    icon: <Shield size={14} className="text-slate-400" />,
  },
};

const SEVERITY_HEX: Record<Severity, string> = {
  CRITICAL: "#EF4444",
  HIGH: "#F97316",
  MEDIUM: "#F59E0B",
  LOW: "#94A3B8",
};

const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

/* ── Obligation tokens ── */
const OBLIGATION_LABELS: Record<string, string> = {
  RENEWAL: "Renouvellement",
  PAYMENT: "Paiement",
  NOTICE: "Préavis / dénonciation",
  OTHER: "Autre échéance",
};

const OBLIGATION_ICON: Record<string, React.ReactNode> = {
  RENEWAL: <RefreshCcw size={14} className="text-violet-500" />,
  PAYMENT: <FileCheck size={14} className="text-emerald-500" />,
  NOTICE: <Calendar size={14} className="text-orange-500" />,
  OTHER: <Calendar size={14} className="text-slate-400" />,
};

const TOOLTIP_STYLE = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 10,
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.08)",
  padding: "8px 12px",
  fontSize: 12,
};

const CARD =
  "bg-white dark:bg-[#16121f] rounded-2xl border border-slate-100 dark:border-white/[0.04] shadow-sm dark:shadow-none";

function scoreColor(score: number) {
  if (score < 40) return "#DC2626";
  if (score < 70) return "#F59E0B";
  return "#16A34A";
}

function scoreLabel(score: number) {
  if (score < 40) return "Non conforme";
  if (score < 70) return "À améliorer";
  return "Conforme";
}

export default function Analyze() {
  const [mode, setMode] = useState<"text" | "pdf">("text");
  const [contractText, setContractText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ContractAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const documentId = searchParams.get("documentId");

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { document } = await getDocumentAnalysis(Number(documentId));
        if (cancelled) return;
        const mapped = mapDocumentToAnalysis(document);
        if (!mapped) {
          setError("Cette analyse n'est pas disponible.");
          return;
        }
        setResult(mapped);
      } catch {
        if (!cancelled) setError("Impossible de charger cette analyse.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const handleFileSelect = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    setError(null);
    setPdfFile(file);
    setExtracting(true);
    try {
      const text = await extractTextFromPdf(file);
      setContractText(text);
    } catch {
      setError("Impossible de lire ce PDF. Essayez un autre fichier.");
      setPdfFile(null);
    } finally {
      setExtracting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const clearPdf = () => {
    setPdfFile(null);
    setContractText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await analyzeContract(contractText, pdfFile?.name);
      setResult(data.analysis);
    } catch {
      setError("Impossible d'analyser le contrat. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setContractText("");
    clearPdf();
    setMode("text");
    navigate("/analyze");
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((c) => (c === index ? null : c)), 2000);
    } catch {
      /* ignore */
    }
  };

  const donutData = result
    ? [
        { name: "Score", value: result.score_global },
        { name: "Reste", value: 100 - result.score_global },
      ]
    : [];

  const sortedRisques = result
    ? [...result.risques].sort((a, b) => {
        const order: Record<string, number> = {
          CRITICAL: 0,
          HIGH: 1,
          MEDIUM: 2,
          LOW: 3,
        };
        return order[a.severite] - order[b.severite];
      })
    : [];

  const severityData = result
    ? SEVERITY_ORDER.map((sev) => ({
        name: SEVERITY_STYLES[sev].label,
        severity: sev,
        value: result.risques.filter((r) => r.severite === sev).length,
      })).filter((d) => d.value > 0)
    : [];

  const criticalCount = result
    ? result.risques.filter((r) => r.severite === "CRITICAL").length
    : 0;
  // Fix: on compte les catégories qui ont réellement des problèmes détectés,
  // pas celles dont le score est tombé sous 40 — avec le clamp backend, une
  // catégorie avec un seul risque HIGH plafonne à 60, pas 40, et doit quand
  // même compter comme "à risque".
  const categoriesAtRiskCount = result
    ? result.categories.filter((c) => c.nb_problemes > 0).length
    : 0;
  const suggestionsCount = result
    ? result.risques.filter((r) => r.clause_suggeree).length
    : 0;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* ── Header ── */}
        {!result && (
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight mb-2">
              Analyser un contrat
            </h1>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Collez le texte ou importez un PDF pour vérifier la conformité réglementaire en quelques secondes
            </p>
          </div>
        )}

        {result && (
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
                Résultat de l'analyse
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {pdfFile?.name || "Analyse textuelle"}
              </p>
            </div>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition"
            >
              <ArrowLeft size={16} />
              Nouvelle analyse
            </button>
          </div>
        )}

        {/* ── Input form ── */}
        {!result && !documentId && (
          <form onSubmit={handleSubmit} className="mb-12 max-w-2xl mx-auto">
            {/* Mode tabs */}
            <div className="flex justify-center gap-1 mb-6 p-1 bg-slate-100 dark:bg-white/5 rounded-xl w-fit mx-auto">
              {(["text", "pdf"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    if (m === "text") clearPdf();
                  }}
                  className={`px-5 py-2 text-sm font-medium rounded-lg transition ${
                    mode === m
                      ? "bg-white dark:bg-[#1e1a2e] text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {m === "text" ? "Texte brut" : "Fichier PDF"}
                </button>
              ))}
            </div>

            {mode === "text" && (
              <div className="relative">
                <textarea
                  value={contractText}
                  onChange={(e) => setContractText(e.target.value)}
                  placeholder="Collez ici le texte complet du contrat..."
                  rows={12}
                  className="w-full bg-white dark:bg-[#16121f] border border-slate-200 dark:border-white/10 focus:border-slate-400 dark:focus:border-white/25 rounded-2xl p-5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none resize-none text-sm leading-relaxed shadow-sm transition"
                />
                <div className="absolute bottom-4 right-4 text-xs text-slate-400 tabular-nums">
                  {contractText.length.toLocaleString()} caractères
                </div>
              </div>
            )}

            {mode === "pdf" && (
              <div className="mb-4">
                {!pdfFile ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/25 rounded-2xl p-12 md:p-16 flex flex-col items-center justify-center text-center cursor-pointer transition bg-white dark:bg-[#16121f] shadow-sm"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                      <Upload
                        size={24}
                        className="text-slate-500 dark:text-slate-400"
                        strokeWidth={1.5}
                      />
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 text-sm font-medium mb-1">
                      Glissez-déposez un PDF, ou cliquez pour parcourir
                    </p>
                    <p className="text-slate-400 text-xs">Format accepté : .pdf</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                  </div>
                ) : (
                  <div className={`${CARD} p-5`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                        <FileText
                          size={22}
                          className="text-red-500"
                          strokeWidth={1.5}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 dark:text-white text-sm font-medium truncate">
                          {pdfFile.name}
                        </p>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {extracting
                            ? "Extraction du texte en cours..."
                            : `${contractText.length.toLocaleString()} caractères extraits`}
                        </p>
                      </div>
                      {extracting ? (
                        <div className="w-5 h-5 border-2 border-slate-300 dark:border-white/20 border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : (
                        <button
                          type="button"
                          onClick={clearPdf}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition shrink-0"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || extracting || !contractText.trim()}
              className="w-full mt-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-3.5 rounded-xl hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm shadow-lg shadow-slate-900/10 dark:shadow-white/10"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 dark:border-slate-900/30 border-t-transparent rounded-full animate-spin" />
                  Analyse en cours...
                </span>
              ) : (
                "Lancer l'analyse"
              )}
            </button>
          </form>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-16 text-slate-500 dark:text-slate-400">
            <div className="w-8 h-8 border-2 border-slate-300 dark:border-white/20 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">
              {documentId ? "Chargement de l'analyse..." : "Analyse en cours..."}
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* ═══════════════════════════════════════
            RESULTS
        ═══════════════════════════════════════ */}
        {result && (
          <div className="space-y-6">
            {/* ── Top row: Score + Summary ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Score card */}
              <div className={`${CARD} md:col-span-4 p-6 flex flex-col items-center justify-center`}>
                <div className="relative">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        innerRadius={50}
                        outerRadius={68}
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      >
                        <Cell fill={scoreColor(result.score_global)} />
                        <Cell fill="#E2E8F0" className="dark:fill-[#1e1a2e]" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className="text-3xl font-bold tabular-nums"
                      style={{ color: scoreColor(result.score_global) }}
                    >
                      {result.score_global}%
                    </span>
                  </div>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-3">
                  {scoreLabel(result.score_global)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Score global</p>
              </div>

              {/* Summary card */}
              <div className={`${CARD} md:col-span-8 p-6 flex flex-col justify-center`}>
                <div className="flex items-center gap-2 mb-3">
                  <FileCheck size={16} className="text-slate-400" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Résumé de l'analyse
                  </p>
                </div>
                <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">
                  {result.resume}
                </p>
              </div>
            </div>

            {/* ── Metrics ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Risques critiques",
                  value: criticalCount,
                  accent: criticalCount > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white",
                },
                {
                  label: "Clauses manquantes",
                  value: result.clauses_manquantes.length,
                  accent: result.clauses_manquantes.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white",
                },
                {
                  label: "Catégories à risque",
                  value: `${categoriesAtRiskCount}/${result.categories.length}`,
                  accent: categoriesAtRiskCount > 0 ? "text-orange-600 dark:text-orange-400" : "text-slate-900 dark:text-white",
                },
                {
                  label: "Reformulations",
                  value: suggestionsCount,
                  accent: "text-emerald-600 dark:text-emerald-400",
                },
              ].map((m, i) => (
                <div key={i} className={`${CARD} p-5`}>
                  <p className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold mb-2">
                    {m.label}
                  </p>
                  <p className={`text-2xl font-bold tabular-nums ${m.accent}`}>
                    {m.value}
                  </p>
                </div>
              ))}
            </div>

            {/* ── Charts ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Category scores */}
              <div className={`${CARD} p-6`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-5">
                  Scores par catégorie
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={result.categories}
                    layout="vertical"
                    margin={{ left: 0, right: 20 }}
                  >
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis
                      type="category"
                      dataKey="nom"
                      width={130}
                      tick={{ fill: "#64748B", fontSize: 11, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value: number) => [`${value}%`, "Score"]}
                    />
                    <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={16}>
                      {result.categories.map((cat, i) => (
                        <Cell key={i} fill={scoreColor(cat.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Risk distribution */}
              <div className={`${CARD} p-6`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-5">
                  Répartition des risques
                </p>
                {severityData.length > 0 ? (
                  <div className="flex items-center gap-8">
                    <ResponsiveContainer width={130} height={130}>
                      <PieChart>
                        <Pie
                          data={severityData}
                          dataKey="value"
                          innerRadius={40}
                          outerRadius={60}
                          stroke="none"
                          paddingAngle={2}
                        >
                          {severityData.map((d, i) => (
                            <Cell key={i} fill={SEVERITY_HEX[d.severity]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3 flex-1">
                      {severityData.map((d, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: SEVERITY_HEX[d.severity] }}
                          />
                          <span className="text-slate-500 dark:text-slate-400 flex-1">
                            {d.name}
                          </span>
                          <span className="text-slate-900 dark:text-white font-bold tabular-nums min-w-[1.5rem] text-right">
                            {d.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[130px] flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm font-medium gap-2">
                    <Shield size={18} />
                    Aucun risque identifié
                  </div>
                )}
              </div>
            </div>

            {/* ── Obligations / échéances ── */}
            {result.obligations && result.obligations.length > 0 && (
              <div className={`${CARD} p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={16} className="text-violet-500" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Échéances
                  </p>
                  <span className="ml-auto text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                    {result.obligations.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {result.obligations.map((obl, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 border border-slate-100 dark:border-white/[0.06] rounded-xl p-4"
                    >
                      <div className="mt-0.5 shrink-0">
                        {OBLIGATION_ICON[obl.type] || OBLIGATION_ICON.OTHER}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 dark:text-white text-sm font-medium">
                          {obl.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            {OBLIGATION_LABELS[obl.type] || obl.type}
                          </span>
                          {obl.date_echeance && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600">·</span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                                {new Date(obl.date_echeance).toLocaleDateString("fr-FR", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Missing clauses ── */}
            {result.clauses_manquantes.length > 0 && (
              <div className={`${CARD} p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Clauses manquantes
                  </p>
                  <span className="ml-auto text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                    {result.clauses_manquantes.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.clauses_manquantes.map((clause, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-lg px-3.5 py-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {clause}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Risks ── */}
            {sortedRisques.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-slate-400" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Risques identifiés
                  </p>
                  <span className="ml-auto text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                    {sortedRisques.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {sortedRisques.map((risque, i) => {
                    const style =
                      SEVERITY_STYLES[risque.severite] || SEVERITY_STYLES.LOW;
                    return (
                      <div
                        key={i}
                        className={`${CARD} border-l-4 ${style.border} p-5 hover:shadow-md transition-shadow`}
                      >
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2">
                          {style.icon}
                          <span
                            className={`text-[11px] uppercase tracking-wider font-bold ${style.color}`}
                          >
                            {style.label}
                          </span>
                        </div>

                        {/* Clause */}
                        <p className="text-slate-900 dark:text-white text-sm font-semibold mb-1.5">
                          {risque.clause}
                        </p>

                        {/* Description */}
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                          {risque.description}
                        </p>

                        {/* Legal ref */}
                        {risque.reference_legale && (
                          <p className="text-slate-400 text-xs mt-3 font-mono bg-slate-50 dark:bg-white/[0.03] inline-block px-2 py-1 rounded-md">
                            Réf: {risque.reference_legale}
                          </p>
                        )}

                        {/* Suggested rewrite */}
                        {risque.clause_suggeree && (
                          <div className={`mt-4 ${style.bg} border border-slate-100 dark:border-white/[0.06] rounded-xl p-4`}>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5">
                                <Sparkles size={12} className="text-slate-400" />
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                                  Reformulation suggérée
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(risque.clause_suggeree!, i)
                                }
                                className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition ${
                                  copiedIndex === i
                                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"
                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                                }`}
                              >
                                {copiedIndex === i ? (
                                  <>
                                    <Check size={12} /> Copié
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} /> Copier
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">
                              {risque.clause_suggeree}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Empty state if no risks ── */}
            {sortedRisques.length === 0 && result.clauses_manquantes.length === 0 && (
              <div className={`${CARD} p-10 text-center`}>
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <Shield size={28} className="text-emerald-500" />
                </div>
                <p className="text-slate-900 dark:text-white font-semibold mb-1">
                  Aucun problème détecté
                </p>
                <p className="text-slate-400 text-sm">
                  Le contrat semble conforme aux exigences réglementaires analysées.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}