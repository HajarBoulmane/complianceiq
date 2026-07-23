import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { askQuestion, listConversations, getConversationMessages } from "../api/compliance";
import type { AskResponse, Conversation, ConversationMessage } from "../api/compliance";
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
} from "lucide-react";

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

  return (
    <div className="min-h-screen bg-violet-50/50 dark:bg-navy flex">
      {/* Sidebar — matches Dashboard styling */}
      <aside className="w-64 bg-white dark:bg-[#1A1420] flex flex-col shadow-sm">
        <div className="bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <LayoutDashboard size={16} className="text-white" />
          </div>
          <h1 className="font-heading text-lg font-bold text-white">
            Compliance<span className="opacity-90">IQ</span>
          </h1>
        </div>

        <div className="p-4 pt-6">
          <button
            onClick={startNewConversation}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90 text-white font-medium text-sm py-2.5 rounded-xl transition"
          >
            <Plus size={16} />
            Nouvelle conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm truncate transition ${
                activeConversationId === conv.id
                  ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 font-medium"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {conv.title || "Nouvelle conversation"}
            </button>
          ))}
        </div>

        <Link
          to="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 mx-4 mb-4 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition text-sm"
        >
          <LayoutDashboard size={18} />
          Retour au dashboard
        </Link>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white dark:bg-[#1A1420] px-8 py-4 flex items-center justify-between shadow-sm shrink-0">
          <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
            Bienvenue, {user?.fullName?.split(" ")[0]}
          </h2>
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

        {/* Chat area */}
        <div className="max-w-3xl w-full mx-auto flex flex-col flex-1 p-8 pb-4 min-h-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center">
              <MessageSquareText className="text-pink-500" size={20} />
            </div>
            <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-pink">
              Poser une question
            </h1>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Interrogez la base réglementaire (CNDP, Code du travail marocain, RGPD)
          </p>

          {/* Message thread */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-[300px]">
            {messages.length === 0 && !loading && (
              <div className="h-full flex items-center justify-center text-center py-16">
                <p className="text-slate-400 text-sm max-w-sm">
                  Posez une question sur vos obligations réglementaires. Ex : "Quelles
                  sont les obligations RGPD pour la conservation des données
                  clients ?"
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    msg.role === "user"
                      ? "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300"
                      : "bg-pink-50 dark:bg-pink-500/10 text-pink-500"
                  }`}
                >
                  {msg.role === "user" ? <User size={15} /> : <MessageSquareText size={15} />}
                </div>

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white"
                      : msg.error
                      ? "bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400"
                      : "bg-white dark:bg-[#0D1410] border border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-200 shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">
                    {msg.content}
                  </p>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className={`mt-3 pt-3 border-t space-y-2 ${
                      msg.role === "user" ? "border-white/20" : "border-slate-100 dark:border-white/10"
                    }`}>
                      <p className={`text-xs uppercase tracking-wide ${
                        msg.role === "user" ? "text-white/70" : "text-slate-400"
                      }`}>
                        Sources consultées
                      </p>
                      {msg.sources.map((source, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                            msg.role === "user" ? "bg-white/10" : "bg-slate-50 dark:bg-white/5"
                          }`}
                        >
                          <FileText size={14} className="shrink-0 text-pink-400" />
                          <span className={`text-xs ${
                            msg.role === "user" ? "text-white/90" : "text-slate-500 dark:text-slate-300"
                          }`}>
                            {source.sourceFile}
                          </span>
                          <span className={`text-xs ml-auto ${
                            msg.role === "user" ? "text-white/60" : "text-slate-400"
                          }`}>
                            section #{source.chunkIndex}
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
                <div className="shrink-0 w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-500/10 text-pink-500 flex items-center justify-center">
                  <MessageSquareText size={15} />
                </div>
                <div className="bg-white dark:bg-[#0D1410] border border-slate-100 dark:border-white/5 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-sm">
                  <div className="w-3.5 h-3.5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-slate-400 text-sm">
                    Recherche dans la base réglementaire...
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit}>
            <div className="bg-white dark:bg-[#0D1410] border border-slate-200 dark:border-white/5 rounded-2xl p-2 flex items-end gap-2 focus-within:border-pink-400 dark:focus-within:border-pink-500/40 transition shadow-sm">
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
                className="shrink-0 bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-xl transition"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}