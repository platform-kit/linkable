/**
 * Shared e-mail utilities for Supabase Edge Functions.
 *
 * Uses the following Deno env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD,
 *   SMTP_FROM_EMAIL, SMTP_FROM_NAME, SITE_NAME
 */

import nodemailer from "npm:nodemailer";

export interface MailAttachment {
  filename: string;
  content: Uint8Array;
  contentType: string;
  cid: string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
}

/**
 * Create an SMTP transport from env vars and send an email.
 */
export async function sendMail({ to, subject, html, attachments }: SendMailOptions) {
  const host = Deno.env.get("SMTP_HOST");
  const port = Number(Deno.env.get("SMTP_PORT") || "587");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASSWORD");
  const fromEmail = Deno.env.get("SMTP_FROM_EMAIL");
  const fromName =
    Deno.env.get("SMTP_FROM_NAME") ||
    Deno.env.get("SITE_NAME") ||
    "Newsletter";

  if (!host || !user || !pass || !fromEmail) {
    throw new Error(
      "Missing SMTP env vars. Required: SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL",
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to,
    subject,
    html,
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content),
      contentType: a.contentType,
      cid: a.cid,
    })),
  });
}

// ── HMAC token utilities ─────────────────────────────────────────────

const enc = new TextEncoder();

export async function hmacSign(
  message: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Helper: get SITE_NAME from env with a fallback. */
export function getSiteName(): string {
  return Deno.env.get("SITE_NAME") || "Newsletter";
}
