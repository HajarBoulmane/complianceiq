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
  ArrowRight,
} from "lucide-react";

/* ── Minimal severity styles — no colorful icon blobs ── */
const SEVERITY_STYLES: Record<
  string,
  { color: string; label: string; dot: string }
> = {
  CRITICAL: {
    color: "text-red-600 dark:text-red-400",
    label: "Critique",
    dot: "bg-red-500",
  },
  HIGH: {
    color: "text-orange-600 dark:text-orange-400",
    label: "Haute",
    dot: "bg-orange-500",
  },
  MEDIUM: {
    color: "text-amber-600 dark:text-amber-400",
    label: "Moyenne",
    dot: "bg-amber-500",
  },
  LOW: {
    color: "text-slate-500 dark:text-slate-400",
    label: "Basse",
    dot: "bg-slate-400",
  },
};

const SEVERITY_HEX: Record<Severity, string> = {
  CRITICAL: "#DC2626",
  HIGH: "#F97316",
  MEDIUM: "#F59E0B",
  LOW: "#94A3B8",
};

const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const TOOLTIP_STYLE = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
};

const CARD =
  "bg-white dark:bg-[#16121f] rounded-2xl border border-slate-100 dark:border-white/[0.04]";

function scoreColor(score: number) {
  if (score < 40) return "#DC2626";
  if (score < 70) return "#F59E0B";
  return "#16A34A";
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
  const categoriesAtRiskCount = result
    ? result.categories.filter((c) => c.score < 40).length
    : 0;
  const suggestionsCount = result
    ? result.risques.filter((r) => r.clause_suggeree).length
    : 0;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Analyser un contrat
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Collez le texte ou importez un PDF pour vérifier la conformité
            réglementaire
          </p>
        </div>

        {/* Input form */}
        {!result && !documentId && (
          <form onSubmit={handleSubmit} className="mb-12">
            {/* Mode tabs */}
            <div className="flex gap-1 mb-4 border-b border-slate-100 dark:border-white/5 pb-px">
              <button
                type="button"
                onClick={() => {
                  setMode("text");
                  clearPdf();
                }}
                className={`px-3 py-2 text-sm font-medium transition relative ${
                  mode === "text"
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                Texte
                {mode === "text" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 dark:bg-white rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setMode("pdf")}
                className={`px-3 py-2 text-sm font-medium transition relative ${
                  mode === "pdf"
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                PDF
                {mode === "pdf" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 dark:bg-white rounded-full" />
                )}
              </button>
            </div>

            {mode === "text" && (
              <textarea
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                placeholder="Collez ici le texte complet du contrat..."
                rows={10}
                className="w-full bg-transparent border border-slate-200 dark:border-white/10 focus:border-slate-400 dark:focus:border-white/20 rounded-2xl p-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none resize-none text-sm mb-4 transition"
              />
            )}

            {mode === "pdf" && (
              <div className="mb-4">
                {!pdfFile ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border border-dashed border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30 rounded-2xl p-10 md:p-14 flex flex-col items-center justify-center text-center cursor-pointer transition bg-transparent"
                  >
                    <Upload
                      size={24}
                      className="text-slate-400 mb-3"
                      strokeWidth={1.5}
                    />
                    <p className="text-slate-600 dark:text-slate-300 text-sm mb-1">
                      Glissez-déposez un PDF, ou cliquez pour parcourir
                    </p>
                    <p className="text-slate-400 text-xs">.pdf uniquement</p>
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
                  <div
                    className={`${CARD} p-4 flex items-center gap-3`}
                  >
                    <FileText
                      size={18}
                      className="text-slate-400 shrink-0"
                      strokeWidth={1.5}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 dark:text-white text-sm truncate">
                        {pdfFile.name}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {extracting
                          ? "Extraction..."
                          : `${contractText.length.toLocaleString()} caractères`}
                      </p>
                    </div>
                    {extracting ? (
                      <div className="w-4 h-4 border-2 border-slate-300 dark:border-white/20 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <button
                        type="button"
                        onClick={clearPdf}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition shrink-0"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || extracting || !contractText.trim()}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium py-3 rounded-xl hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
            >
              {loading ? "Analyse en cours..." : "Lancer l'analyse"}
            </button>
          </form>
        )}

        {loading && (
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm mb-8">
            <div className="w-4 h-4 border-2 border-slate-300 dark:border-white/20 border-t-transparent rounded-full animate-spin" />
            {documentId
              ? "Chargement de l'analyse..."
              : "Analyse en cours..."}
          </div>
        )}

        {error && (
          <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3 mb-8">
            {error}
          </p>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-8">
            <button
              onClick={reset}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1"
            >
              <ArrowRight size={12} className="rotate-180" />
              Nouvelle analyse
            </button>

            {/* Score + Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className={`${CARD} p-6 flex flex-col items-center justify-center aspect-square md:aspect-auto`}
              >
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      innerRadius={42}
                      outerRadius={58}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      <Cell fill={scoreColor(result.score_global)} />
                      <Cell fill="#E2E8F0" className="dark:fill-[#1e1a2e]" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <p
                  className="text-3xl font-semibold -mt-28 mb-20 tabular-nums"
                  style={{ color: scoreColor(result.score_global) }}
                >
                  {result.score_global}%
                </p>
                <p className="text-slate-400 text-[11px] uppercase tracking-wider font-medium">
                  Score global
                </p>
              </div>

              <div className={`${CARD} md:col-span-2 p-6`}>
                <p className="text-slate-400 text-[11px] uppercase tracking-wider font-medium mb-3">
                  Résumé
                </p>
                <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">
                  {result.resume}
                </p>
              </div>
            </div>

            {/* Metrics — flat, minimal */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Risques critiques", value: criticalCount },
                { label: "Clauses manquantes", value: result.clauses_manquantes.length },
                { label: "Catégories à risque", value: `${categoriesAtRiskCount}/${result.categories.length}` },
                { label: "Reformulations", value: suggestionsCount },
              ].map((m, i) => (
                <div key={i} className={`${CARD} p-4`}>
                  <p className="text-slate-400 text-[11px] uppercase tracking-wider font-medium mb-1">
                    {m.label}
                  </p>
                  <p className="text-xl font-semibold text-slate-900 dark:text-white tabular-nums">
                    {m.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`${CARD} p-5`}>
                <p className="text-slate-400 text-[11px] uppercase tracking-wider font-medium mb-4">
                  Scores par catégorie
                </p>
                <div className="min-w-[260px]">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={result.categories}
                      layout="vertical"
                      margin={{ left: 10 }}
                    >
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis
                        type="category"
                        dataKey="nom"
                        width={120}
                        tick={{ fill: "#94A3B8", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar
                        dataKey="score"
                        radius={[0, 4, 4, 0]}
                        barSize={14}
                      >
                        {result.categories.map((cat, i) => (
                          <Cell key={i} fill={scoreColor(cat.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`${CARD} p-5`}>
                <p className="text-slate-400 text-[11px] uppercase tracking-wider font-medium mb-4">
                  Répartition des risques
                </p>
                {severityData.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie
                          data={severityData}
                          dataKey="value"
                          innerRadius={36}
                          outerRadius={54}
                          stroke="none"
                        >
                          {severityData.map((d, i) => (
                            <Cell key={i} fill={SEVERITY_HEX[d.severity]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {severityData.map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: SEVERITY_HEX[d.severity],
                            }}
                          />
                          <span className="text-slate-500 dark:text-slate-400 flex-1">
                            {d.name}
                          </span>
                          <span className="text-slate-900 dark:text-white font-medium tabular-nums">
                            {d.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[120px] flex items-center text-emerald-600 dark:text-emerald-400 text-sm">
                    Aucun risque identifié
                  </div>
                )}
              </div>
            </div>

            {/* Missing clauses */}
            {result.clauses_manquantes.length > 0 && (
              <div className={`${CARD} p-5`}>
                <p className="text-slate-400 text-[11px] uppercase tracking-wider font-medium mb-4">
                  Clauses manquantes
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.clauses_manquantes.map((clause, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5"
                    >
                      <span className="w-1 h-1 rounded-full bg-slate-400" />
                      {clause}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Risks */}
            {sortedRisques.length > 0 && (
              <div>
                <p className="text-slate-400 text-[11px] uppercase tracking-wider font-medium mb-3">
                  Risques identifiés
                </p>
                <div className="space-y-2">
                  {sortedRisques.map((risque, i) => {
                    const style =
                      SEVERITY_STYLES[risque.severite] ||
                      SEVERITY_STYLES.LOW;
                    return (
                      <div
                        key={i}
                        className={`${CARD} p-4 hover:border-slate-200 dark:hover:border-white/10 transition`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${style.dot}`}
                          />
                          <span
                            className={`text-[10px] uppercase tracking-wider font-semibold ${style.color}`}
                          >
                            {style.label}
                          </span>
                        </div>
                        <p className="text-slate-900 dark:text-white text-sm font-medium mb-1">
                          {risque.clause}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                          {risque.description}
                        </p>
                        {risque.reference_legale && (
                          <p className="text-slate-400 text-xs mt-2">
                            Réf: {risque.reference_legale}
                          </p>
                        )}
                        {risque.clause_suggeree && (
                          <div className="mt-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl p-3">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <p className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">
                                Reformulation suggérée
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(risque.clause_suggeree!, i)
                                }
                                className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                              >
                                {copiedIndex === i ? (
                                  <>
                                    <Check size={11} /> Copié
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} /> Copier
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
          </div>
        )}
      </div>
    </AppLayout>
  );
}