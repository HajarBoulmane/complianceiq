import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth";
import { useAuth } from "../context/authContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginUser({ email, password });
      setUser(data.user);
      navigate("/dashboard");
    } catch (error) {
      setError("Email ou mot de passe incorrect");
      console.error("Erreur lors de la connexion:", error);
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
            Connectez-vous à votre espace conformité
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#141B2E] border border-white/10 rounded-xl p-8 shadow-xl"
        >
          <div className="mb-5">
            <label className="block text-sm text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@entreprise.com"
              required
              className="w-full bg-[#0D1410] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition"
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm text-slate-300 mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[#0D1410] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <p className="text-center text-sm text-slate-400 mt-5">
            Pas encore de compte ?{" "}
            <a href="/register" className="text-pink-400 hover:underline">
              Créer un compte
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}