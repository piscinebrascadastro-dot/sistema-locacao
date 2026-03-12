import nodemailer from "nodemailer";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendMail({ to, subject, html }: SendMailInput) {
  const host = requireEnv("SMTP_HOST");
  const port = Number(requireEnv("SMTP_PORT"));
  const user = requireEnv("SMTP_USER");
  const pass = requireEnv("SMTP_PASS");
  const from = process.env.SMTP_FROM || user;
  const secure = (process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });

  return info;
}
