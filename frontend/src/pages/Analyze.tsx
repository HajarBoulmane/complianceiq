import { useState, useRef, type ReactNode } from "react";
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
import { analyzeContract } from "../api/compliance";
import type { ContractAnalysis } from "../api/compliance";
import { extractTextFromPdf } from "../utils/pdfExtract";
import AppLayout from "../components/Layout";
import {
  FileSearch,
  AlertTriangle,
  AlertCircle,
  Info,
  FileWarning,
  Upload,
  FileText,
  X,
} from "lucide-react";

type SeverityStyle = {
  color: string;
  bg: string;
  border: string;
  icon: ReactNode;
  label: string;
};

const SEVERITY_STYLES: Record<string, SeverityStyle> = {
  haute: {
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-500/10",
    border: "border-red-200 dark:border-red-500/30",
    icon: <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />,
    label: "Sévérité haute",
  },
  moyenne: {
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-500/10",
    border: "border-orange-200 dark:border-orange-500/30",
    icon: <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />,
    label: "Sévérité moyenne",
  },
  basse: {
    color: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-500/10",
    border: "border-slate-200 dark:border-slate-500/30",
    icon: <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />,
    label: "Sévérité basse",
  },
};

function scoreColor(score: number) {
  if (score < 40) return "#EF4444";
  if (score < 70) return "#F59E0B";
  return "#22C55E";
}

export default function Analyze() {
  const [mode, setMode] = useState<"text" | "pdf">("text");
  const [contractText, setContractText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ContractAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      setError("Impossible d'analyser le contrat. Réessayez.");
      console.error(err);
    } finally {
      setLoading(false);
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
        const order = { haute: 0, moyenne: 1, basse: 2 };
        return order[a.severite] - order[b.severite];
      })
    : [];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center">
            <FileSearch className="text-pink-500" size={20} />
          </div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Analyser un contrat
          </h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
          Collez le texte du contrat ou importez un PDF pour vérifier sa conformité réglementaire
        </p>

        {!result && (
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setMode("text");
                  clearPdf();
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  mode === "text"
                    ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white"
                    : "bg-white dark:bg-[#0D1410] border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Coller le texte
              </button>
              <button
                type="button"
                onClick={() => setMode("pdf")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  mode === "pdf"
                    ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white"
                    : "bg-white dark:bg-[#0D1410] border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Importer un PDF
              </button>
            </div>

            {mode === "text" && (
              <textarea
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                placeholder="Collez ici le texte complet du contrat..."
                rows={12}
                className="w-full bg-white dark:bg-[#0D1410] border border-slate-200 dark:border-white/5 focus:border-pink-400 dark:focus:border-pink-500/40 rounded-2xl p-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none text-sm mb-4 transition shadow-sm"
              />
            )}

            {mode === "pdf" && (
              <div className="mb-4">
                {!pdfFile ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-pink-400 dark:hover:border-pink-500/40 rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition bg-white dark:bg-[#0D1410] shadow-sm"
                  >
                    <Upload size={28} className="text-pink-500 mb-3" />
                    <p className="text-slate-600 dark:text-slate-300 text-sm mb-1">
                      Glissez-déposez un PDF ici, ou cliquez pour parcourir
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
                  <div className="bg-white dark:bg-[#0D1410] border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-pink-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 dark:text-white text-sm truncate">{pdfFile.name}</p>
                      <p className="text-slate-400 text-xs">
                        {extracting
                          ? "Extraction du texte en cours..."
                          : `${contractText.length.toLocaleString()} caractères extraits`}
                      </p>
                    </div>
                    {extracting ? (
                      <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <button
                        type="button"
                        onClick={clearPdf}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition shrink-0"
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
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
            >
              {loading ? "Analyse en cours..." : "Lancer l'analyse"}
            </button>
          </form>
        )}

        {loading && (
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm mb-6">
            <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            Analyse du contrat en cours (cela peut prendre quelques secondes)...
          </div>
        )}

        {error && (
          <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-4 py-3 mb-6">
            {error}
          </p>
        )}

        {result && (
          <div className="space-y-6">
            <button
              onClick={() => {
                setResult(null);
                setContractText("");
                clearPdf();
                setMode("text");
              }}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition inline-flex items-center gap-2"
            >
              <FileSearch size={14} />
              Analyser un autre contrat
            </button>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-[#0D1410] border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center shadow-sm">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      innerRadius={45}
                      outerRadius={65}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      <Cell fill={scoreColor(result.score_global)} />
                      <Cell fill="#E2E8F0" className="dark:fill-[#1F2922]" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <p
                  className="font-heading text-3xl font-bold -mt-24 mb-16"
                  style={{ color: scoreColor(result.score_global) }}
                >
                  {result.score_global}%
                </p>
                <p className="text-slate-400 text-xs uppercase tracking-wide mt-2">
                  Score global
                </p>
              </div>

              <div className="col-span-2 bg-white dark:bg-[#0D1410] border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">
                  Résumé
                </p>
                <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">
                  {result.resume}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0D1410] border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-4">
                Scores par catégorie
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={result.categories} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis
                    type="category"
                    dataKey="nom"
                    width={160}
                    tick={{ fill: "#94A3B8", fontSize: 12 }}
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
                  <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={18}>
                    {result.categories.map((cat, i) => (
                      <Cell key={i} fill={scoreColor(cat.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {result.clauses_manquantes.length > 0 && (
              <div className="bg-white dark:bg-[#0D1410] border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-4">
                  Clauses manquantes
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {result.clauses_manquantes.map((clause, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-pink-50 dark:bg-pink-500/5 border border-pink-200 dark:border-pink-500/20 rounded-lg px-3 py-2"
                    >
                      <FileWarning size={14} className="text-pink-500 shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 text-sm">{clause}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sortedRisques.length > 0 && (
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">
                  Risques identifiés ({sortedRisques.length})
                </p>
                <div className="space-y-2">
                  {sortedRisques.map((risque, i) => {
                    const style = SEVERITY_STYLES[risque.severite] || SEVERITY_STYLES.basse;
                    return (
                      <div
                        key={i}
                        className={`flex gap-3 ${style.bg} border ${style.border} rounded-xl px-4 py-3`}
                      >
                        {style.icon}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-slate-900 dark:text-white text-sm font-medium">
                              {risque.clause}
                            </p>
                            <span
                              className={`text-[10px] uppercase tracking-wide ${style.color} font-semibold`}
                            >
                              {style.label}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-sm">
                            {risque.description}
                          </p>
                          {risque.reference_legale && (
                            <p className="text-slate-400 text-xs mt-1">
                              Réf: {risque.reference_legale}
                            </p>
                          )}
                        </div>
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