import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { registerUser } from "../api/auth";

function getPasswordStrength(password: string): { label: string; score: number; color: string } {
  if (password.length === 0) return { label: "", score: 0, color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { label: "Faible", score: 1, color: "bg-red-500" };
  if (score <= 3) return { label: "Moyen", score: 2, color: "bg-amber-500" };
  return { label: "Fort", score: 3, color: "bg-emerald-500" };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const strength = getPasswordStrength(password);

  const isValid = useMemo(() => {
    return (
      fullName.trim().length >= 2 &&
      EMAIL_REGEX.test(email.trim()) &&
      password.length >= 8 &&
      password === confirmPassword &&
      strength.score >= 2
    );
  }, [fullName, email, password, confirmPassword, strength.score]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setError(null);
    setLoading(true);

    try {
      await registerUser({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      navigate("/verify-email", { state: { email: email.trim() } });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "";
      
      if (msg.includes("EMAIL_ALREADY_EXISTS") || msg.includes("409")) {
        setError("Cet email est déjà utilisé. Essayez de vous connecter.");
      } else if (msg.includes("password") || msg.includes("mot de passe")) {
        setError("Le mot de passe ne respecte pas les critères requis.");
      } else {
        setError("Erreur lors de l'inscription. Veuillez réessayer.");
      }
      
      console.error("Register error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-white">
            Compliance<span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">IQ</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Créez votre compte pour commencer
          </p>
        </div>

        <div className="bg-[#141B2E] border border-white/10 rounded-xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-5">
              <label className="block text-sm text-slate-300 mb-1.5">Nom complet</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Votre nom"
                required
                className="w-full bg-[#0D1410] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition"
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.com"
                required
                className={`w-full bg-[#0D1410] border rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition ${
                  email && !EMAIL_REGEX.test(email) ? "border-red-500" : "border-white/10"
                }`}
              />
              {email && !EMAIL_REGEX.test(email) && (
                <p className="text-red-400 text-xs mt-1">Format d'email invalide</p>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-sm text-slate-300 mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full bg-[#0D1410] border border-white/10 rounded-lg px-4 py-2.5 pr-11 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition ${
                          i <= strength.score ? strength.color : "bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{strength.label}</p>
                  {strength.score < 2 && (
                    <p className="text-amber-400 text-xs mt-1">
                      Minimum 8 caractères, majuscule, chiffre et symbole recommandés
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-sm text-slate-300 mb-1.5">Confirmer le mot de passe</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={`w-full bg-[#0D1410] border rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition ${
                  confirmPassword && password !== confirmPassword ? "border-red-500" : "border-white/10"
                }`}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-400 text-xs mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!isValid || loading}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Création du compte...
                </>
              ) : (
                "S'inscrire"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-5">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-pink-400 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}