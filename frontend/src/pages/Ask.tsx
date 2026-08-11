import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  askQuestion,
  listConversations,
  getConversationMessages,
  deleteConversation,
} from "../api/compliance";
import type {
  AskResponse,
  Conversation,
  ConversationMessage,
} from "../api/compliance";
import { useAuth } from "../context/authContext";
import { useTheme } from "../context/themeContext";

import {
  MessageSquareText,
  Send,
  FileText,
  User,
  Sun,
  Moon,
  Bell,
  Plus,
  LayoutDashboard,
  FileSearch,
  Trash2,
} from "lucide-react";

/* ── One accent family, used everywhere ── */
const ACCENT = {
  from: "#EC4899",
  to: "#7C3AED",
  light: "bg-pink-50 dark:bg-pink-500/[0.08]",
  text: "text-pink-600 dark:text-pink-400",
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AskResponse["sources"];
  error?: boolean;
};

export default function Ask() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    listConversations()
      .then((res) => setConversations(res.conversations))
      .catch((err) => console.error(err));
  }, []);

  const startNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  const loadConversation = async (id: number) => {
    setActiveConversationId(id);
    try {
      const res = await getConversationMessages(id);
      const chatMsgs = res.conversation.messages.map((msg: ConversationMessage) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sources: msg.sources,
      }));
      setMessages(chatMsgs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConversation = (event: React.MouseEvent, conversation: Conversation) => {
    event.stopPropagation();
    setConversationToDelete(conversation);
  };

  const confirmDelete = async () => {
    if (!conversationToDelete) return;
    try {
      await deleteConversation(conversationToDelete.id);
      setConversations((prev) => prev.filter((c) => c.id !== conversationToDelete.id));
      if (activeConversationId === conversationToDelete.id) startNewConversation();
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
    } finally {
      setConversationToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const data = await askQuestion(trimmed, activeConversationId ?? undefined);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        sources: data.sources,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (!activeConversationId && data.conversationId) {
        setActiveConversationId(data.conversationId);
        listConversations()
          .then((res) => setConversations(res.conversations))
          .catch(() => {});
      }
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Impossible d'obtenir une réponse. Réessayez.",
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const cardBase =
    "bg-white dark:bg-[#16121f] rounded-2xl border border-slate-100 dark:border-white/[0.06] shadow-sm";

  /* ── CHANGED: response bubble for BOTH light & dark mode ── */
  const responseBubble =
    "bg-pink-50 dark:bg-[#24182e] rounded-2xl border border-pink-200 dark:border-pink-500/20 shadow-sm";

  return (
    <div className="h-screen bg-[#f8f7fb] dark:bg-[#0a0614] flex overflow-hidden transition-colors duration-300">
      {/* ═══════════════════════════════════════
          SIDEBAR
         ═══════════════════════════════════════ */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col h-screen sticky top-0
        bg-[#fdf8fb] dark:bg-[#16121f]
        border-r border-pink-100/60 dark:border-white/[0.05]">
        
        {/* Inset gradient header */}
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

        {/* New conversation — flat button, not gradient */}
        <div className="p-3 pt-4">
          <button
            onClick={startNewConversation}
            className={`w-full flex items-center justify-center gap-2 ${ACCENT.light} ${ACCENT.text} font-semibold text-sm py-2.5 rounded-xl hover:opacity-80 transition border border-pink-100 dark:border-pink-500/20`}
          >
            <Plus size={16} />
            Nouvelle conversation
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-4">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group w-full flex items-center gap-1 rounded-xl transition ${
                activeConversationId === conv.id
                  ? `${ACCENT.light} border border-pink-100 dark:border-pink-500/20`
                  : "hover:bg-white dark:hover:bg-white/5"
              }`}
            >
              <button
                onClick={() => loadConversation(conv.id)}
                className={`flex-1 min-w-0 text-left px-3 py-2.5 text-sm truncate transition font-medium ${
                  activeConversationId === conv.id
                    ? ACCENT.text
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {conv.title || "Nouvelle conversation"}
              </button>
              <button
                onClick={(e) => handleDeleteConversation(e, conv)}
                className="shrink-0 p-1.5 mr-1 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 transition"
                title="Supprimer la conversation"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <Link
          to="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 mx-3 mb-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition text-sm font-medium"
        >
          <LayoutDashboard size={18} />
          Retour au dashboard
        </Link>
      </aside>

      {/* ═══════════════════════════════════════
          MAIN COLUMN
         ═══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 pb-16 md:pb-0 overflow-hidden">
        {/* Top bar — matches AppLayout exactly */}
        <div className="bg-white dark:bg-[#16121f] px-4 md:px-8 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] sticky top-0 z-10 shrink-0">
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
            <button className="relative p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200">
              <Bell size={18} />
            </button>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
              style={{ background: `linear-gradient(135deg, ${ACCENT.from}, ${ACCENT.to})` }}
            >
              {user?.fullName?.[0]?.toUpperCase() || "U"}
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="max-w-3xl w-full mx-auto flex flex-col flex-1 p-4 md:p-8 pb-4 min-h-0 overflow-hidden">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl ${ACCENT.light} flex items-center justify-center shrink-0`}>
              <MessageSquareText className={ACCENT.text} size={20} />
            </div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Poser une question
            </h1>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Interrogez la base réglementaire (CNDP, Code du travail marocain, RGPD)
          </p>

          {/* Message thread */}
          <div className="flex-1 overflow-y-auto space-y-5 mb-4 min-h-0 pr-1">
            {messages.length === 0 && !loading && (
              <div className="h-full flex items-center justify-center text-center py-16">
                <div className={`${cardBase} px-6 py-8 max-w-sm`}>
                  <MessageSquareText className={`mx-auto mb-3 ${ACCENT.text}`} size={28} />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Posez une question sur vos obligations réglementaires. Ex : "Quelles sont les obligations RGPD pour la conservation des données clients ?"
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    msg.role === "user"
                      ? "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300"
                      : `${ACCENT.light} ${ACCENT.text}`
                  }`}
                >
                  {msg.role === "user" ? <User size={15} /> : <MessageSquareText size={15} />}
                </div>

                <div
                  className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                      : msg.error
                        ? "bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400"
                        : responseBubble
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">
                    {msg.content}
                  </p>

                  {msg.sources && msg.sources.length > 0 && (
                    <div
                      className={`mt-3 pt-3 border-t space-y-2 ${
                        msg.role === "user"
                          ? "border-white/20"
                          : "border-pink-200 dark:border-pink-500/20"
                      }`}
                    >
                      <p
                        className={`text-[11px] uppercase tracking-wider font-semibold ${
                          msg.role === "user" ? "text-white/60" : "text-pink-500/70 dark:text-pink-400/70"
                        }`}
                      >
                        Sources consultées
                      </p>
                      {msg.sources.map((source, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                            msg.role === "user" ? "bg-white/10" : "bg-white dark:bg-white/5"
                          }`}
                        >
                          <FileText size={14} className="shrink-0 text-pink-400" />
                          <span
                            className={`text-xs ${
                              msg.role === "user" ? "text-white/90" : "text-slate-500 dark:text-slate-300"
                            }`}
                          >
                            {source.sourceFile}
                          </span>
                          <span
                            className={`text-xs ml-auto tabular-nums ${
                              msg.role === "user" ? "text-white/50" : "text-slate-400"
                            }`}
                          >
                            #{source.chunkIndex}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className={`shrink-0 w-8 h-8 rounded-lg ${ACCENT.light} ${ACCENT.text} flex items-center justify-center`}>
                  <MessageSquareText size={15} />
                </div>
                <div className={`${responseBubble} rounded-2xl px-4 py-3 flex items-center gap-2`}>
                  <div className="w-3.5 h-3.5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-slate-400 text-sm">Recherche dans la base réglementaire...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit}>
            <div className={`${cardBase} p-2 flex items-end gap-2 focus-within:ring-2 focus-within:ring-pink-500/20 focus-within:border-pink-300 dark:focus-within:border-pink-500/30 transition-all`}>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question..."
                rows={2}
                className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2 focus:outline-none resize-none text-sm"
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="shrink-0 text-white p-3 rounded-xl transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                style={{ background: `linear-gradient(135deg, ${ACCENT.from}, ${ACCENT.to})` }}
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete modal */}
      {conversationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className={`w-full max-w-md rounded-2xl ${cardBase} p-6`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
                <Trash2 size={18} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Supprimer la conversation
              </h3>
            </div>

            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Êtes-vous sûr de vouloir supprimer
              <span className="font-semibold text-slate-900 dark:text-white">
                {" "}{conversationToDelete.title || "cette conversation"}
              </span>
              ? Cette action est irréversible.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConversationToDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#16121f]/80 backdrop-blur-lg border-t border-slate-200 dark:border-white/10 flex items-center justify-around py-2 z-50">
        <Link
          to="/dashboard"
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-slate-500 dark:text-slate-400"
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-medium">Dashboard</span>
        </Link>
        <div className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-pink-600 dark:text-pink-400">
          <MessageSquareText size={20} />
          <span className="text-[10px] font-medium">Question</span>
        </div>
        <Link
          to="/analyze"
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-slate-500 dark:text-slate-400"
        >
          <FileSearch size={20} />
          <span className="text-[10px] font-medium">Analyser</span>
        </Link>
      </nav>
    </div>
  );
}