import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { verifyCode } from "../api/auth";

export default function VerifyEmail() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyCode({ email, code });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError("Code invalide ou expiré");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1120] px-4">
        <p className="text-slate-400">Session invalide, retourne à l'inscription.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-white">
            Compliance<span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">IQ</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Un code a été envoyé à <span className="text-white">{email}</span>
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#141B2E] border border-white/10 rounded-xl p-8 shadow-xl"
        >
          <div className="mb-5">
            <label className="block text-sm text-slate-300 mb-1.5">Code de vérification</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              required
              disabled={success}
              className="w-full bg-[#0D1410] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-emerald-400 text-sm text-center">
              Email vérifié ! 
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition"
          >
            {loading ? "Vérification..." : success ? "Redirection..." : "Vérifier"}
          </button>
        </form>
      </div>
    </div>
  );
}