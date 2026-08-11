import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(to: string, code: string) {
  await resend.emails.send({
    from: "ComplianceIQ <onboarding@resend.dev>", // domaine de test Resend, marche direct sans config DNS
    to,
    subject: "Vérifie ton compte ComplianceIQ",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Vérification de ton compte</h2>
        <p>Voici ton code de vérification :</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f4f4f4; padding: 16px; text-align: center; border-radius: 8px;">
          ${code}
        </div>
        <p>Ce code expire dans 10 minutes.</p>
      </div>
    `,
  });
}