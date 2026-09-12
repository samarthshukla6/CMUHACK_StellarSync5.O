import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

const REQUIRED_VARS = [
  "EMAIL_SERVER_HOST",
  "EMAIL_SERVER_USER",
  "EMAIL_SERVER_PASSWORD",
  "EMAIL_FROM",
] as const;

export function getEmailConfigError(): string | null {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]?.trim());
  if (missing.length === 0) return null;
  return `Email not configured. Add to .env: ${missing.join(", ")}`;
}

export function createEmailTransporter(): {
  transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null;
  configError: string | null;
} {
  const configError = getEmailConfigError();
  if (configError) return { transporter: null, configError };

  const port = Number(process.env.EMAIL_SERVER_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  return { transporter, configError: null };
}

export async function verifyEmailTransporter(
  transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>
): Promise<string | null> {
  try {
    await transporter.verify();
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown SMTP error";
    console.error("SMTP verify failed:", message);
    return `Could not connect to email server (${process.env.EMAIL_SERVER_HOST}). Check host, port, user, and password — for Gmail use an App Password.`;
  }
}

export function getEmailFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() ?? "";
}
