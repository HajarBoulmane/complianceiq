import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendVerificationEmail(to: string, code: string) {
  await transporter.sendMail({
     from: `"ComplianceIQ" <${process.env.GMAIL_USER}>`,
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