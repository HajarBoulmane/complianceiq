import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../api/auth";
import { useAuth } from "../context/authContext";

export default function Register() {
  const [fullName, setFullName] = useState("");
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
      const data = await registerUser({ fullName, email, password });
      setUser(data.user);
      navigate("/dashboard");
    } catch (err) {
      setError("Erreur lors de l'inscription. Vérifiez vos informations.");
      console.error("Erreur lors de l'inscription:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-white">
            Compliance<span className="text-teal">IQ</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Créez votre compte pour commencer
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 shadow-xl backdrop-blur-sm"
        >
          <div className="mb-5">
            <label className="block text-sm text-slate-300 mb-1.5">Nom complet</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Votre nom"
              required
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition"
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
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition"
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
              minLength={8}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition"
            />
          </div>

          {error && (
            <p className="text-amber text-sm mb-4 bg-amber/10 border border-amber/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal hover:bg-teal/90 disabled:opacity-50 disabled:cursor-not-allowed text-navy font-semibold py-2.5 rounded-lg transition"
          >
            {loading ? "Création du compte..." : "S'inscrire"}
          </button>

          <p className="text-center text-sm text-slate-400 mt-5">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-teal hover:underline">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}