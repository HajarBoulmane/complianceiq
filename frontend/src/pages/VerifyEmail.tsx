import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { verifyEmail, resendCode } from "../api/auth";
import { useAuth } from "../context/authContext";

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const verificationState = location.state as { email?: string; info?: string } | null;
  const email = verificationState?.email;

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(verificationState?.info ?? null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!email) return <Navigate to="/login" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const data = await verifyEmail(email, code);
      setUser(data.user);
      navigate("/dashboard");
    } catch {
      setError("Code invalide ou expiré. Demandez un nouveau code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    try {
      await resendCode(email);
      setInfo("Si le compte existe, un nouveau code a été envoyé.");
      setCooldown(30);
    } catch (err) {
      const requestError = err as { status?: number; data?: { code?: string } };
      setError(
        requestError.data?.code === "VERIFICATION_EMAIL_FAILED"
          ? "Le code n'a pas pu être envoyé. Vérifiez la configuration email du serveur."
          : requestError.status === 429
            ? "Trop de tentatives, réessayez plus tard."
            : "Impossible de renvoyer le code. Réessayez plus tard."
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] px-4">
      <div className="w-full max-w-md bg-[#141B2E] border border-white/10 rounded-xl p-8 shadow-xl">
        <h1 className="font-heading text-2xl font-bold text-white mb-2">
          Vérifiez votre email
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Entrez le code à 6 chiffres envoyé à {email}.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            required
            className="w-full bg-[#0D1410] border border-white/10 rounded-lg px-4 py-2.5 text-white text-center tracking-[0.5em] text-lg placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 transition mb-4"
          />

          {error && (
            <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {info && <p className="text-teal-400 text-sm mb-4">{info}</p>}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition"
          >
            {loading ? "Vérification..." : "Vérifier"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="w-full mt-4 text-sm text-pink-400 hover:underline disabled:text-slate-500 disabled:no-underline"
        >
          {cooldown > 0 ? `Renvoyer le code (${cooldown}s)` : "Renvoyer le code"}
        </button>
      </div>
    </div>
  );
}