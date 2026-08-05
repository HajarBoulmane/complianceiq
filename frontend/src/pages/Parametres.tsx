import AppLayout from "../components/Layout";
import { useAuth } from "../context/authContext";
import { useTheme } from "../context/themeContext";
import { Settings, Sun, Moon, User, Lock, Mail } from "lucide-react";

export default function Parametres() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center shrink-0">
            <Settings className="text-pink-500" size={20} />
          </div>
          <h1 className="font-heading text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
            Paramètres
          </h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
          Gérez votre compte et les préférences de l'application
        </p>

        {/* Apparence */}
        <div className="bg-white dark:bg-[#1A1420] rounded-2xl p-4 md:p-6 shadow-sm mb-4">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-4">Apparence</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                {theme === "dark" ? (
                  <Moon size={16} className="text-violet-400" />
                ) : (
                  <Sun size={16} className="text-orange-400" />
                )}
              </div>
              <div>
                <p className="text-slate-700 dark:text-slate-200 text-sm font-medium">Thème</p>
                <p className="text-slate-400 text-xs">
                  {theme === "dark" ? "Mode sombre activé" : "Mode clair activé"}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6.5 h-6 rounded-full transition shrink-0 ${
                theme === "dark" ? "bg-violet-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  theme === "dark" ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Profil */}
        <div className="bg-white dark:bg-[#1A1420] rounded-2xl p-4 md:p-6 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-400 text-xs uppercase tracking-wide">Profil</p>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-500 bg-violet-50 dark:bg-violet-500/10 px-2 py-1 rounded-full">
              Bientôt disponible
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-xs mb-1.5 flex items-center gap-1.5">
                <User size={12} /> Nom complet
              </label>
              <input
                disabled
                value={user?.fullName || ""}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1.5 flex items-center gap-1.5">
                <Mail size={12} /> Email
              </label>
              <input
                disabled
                value={user?.email || ""}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed"
              />
            </div>
          </div>
          <p className="text-slate-400 text-xs mt-3">
            La modification du profil sera disponible dans une prochaine version.
          </p>
        </div>

        {/* Sécurité */}
        <div className="bg-white dark:bg-[#1A1420] rounded-2xl p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-400 text-xs uppercase tracking-wide">Sécurité</p>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-500 bg-violet-50 dark:bg-violet-500/10 px-2 py-1 rounded-full">
              Bientôt disponible
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center">
              <Lock size={16} className="text-slate-400" />
            </div>
            <div>
              <p className="text-slate-700 dark:text-slate-200 text-sm font-medium">
                Changer le mot de passe
              </p>
              <p className="text-slate-400 text-xs">
                Cette fonctionnalité arrive dans une prochaine mise à jour
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}