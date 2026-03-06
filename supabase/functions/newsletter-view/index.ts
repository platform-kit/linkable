import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { hmacSign, getSiteName } from "../_shared/email.ts";

/**
 * Public newsletter view page.
 * Displays the full body content of a newsletter send and tracks clicks.
 *
 * GET /newsletter-view?id=<sendId>&sid=<subscriberId>&token=<hmac>
 *
 * The token verifies the click is from a real email recipient.
 * After verification, records a click event and renders the full HTML page.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const sendId = url.searchParams.get("id") || "";
  const subscriberId = url.searchParams.get("sid") || "";
  const token = url.searchParams.get("token") || "";

  const htmlHeaders = {
    ...corsHeaders,
    "Content-Type": "text/html; charset=utf-8",
  };

  // If no sendId, return a list of sent newsletters (public archive)
  if (!sendId) {
    const supabaseList = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: sends, error: listErr } = await supabaseList
      .from("newsletter_sends")
      .select("id, subject, cover_image, excerpt_html, tags, sent_at")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(50);

    if (listErr) {
      return new Response(JSON.stringify({ error: "Failed to load newsletters" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(sends || []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch the send record
  const { data: send, error: sendErr } = await supabase
    .from("newsletter_sends")
    .select("id, subject, cover_image, body_html, excerpt_html, sent_at")
    .eq("id", sendId)
    .single();

  if (sendErr || !send) {
    return new Response(errorPage("Newsletter not found"), {
      status: 404,
      headers: htmlHeaders,
    });
  }

  // Track click if token is valid (don't block rendering if tracking fails)
  if (subscriberId && token) {
    try {
      const secret = Deno.env.get("NEWSLETTER_SECRET");
      if (secret) {
        const expected = await hmacSign(
          `click|${sendId}|${subscriberId}`,
          secret,
        );
        if (token === expected) {
          await supabase.from("newsletter_clicks").insert({
            send_id: sendId,
            subscriber_id: subscriberId,
          });
        }
      }
    } catch (err) {
      console.error("Click tracking error:", err);
    }
  }

  const siteName = getSiteName();
  const bodyHtml = send.body_html || send.excerpt_html || "";

  // Return JSON when requested by the frontend (Accept: application/json)
  const accept = req.headers.get("Accept") || "";
  if (accept.includes("application/json")) {
    return new Response(
      JSON.stringify({
        id: send.id,
        subject: send.subject,
        cover_image: send.cover_image || "",
        body_html: bodyHtml,
        sent_at: send.sent_at,
        site_name: siteName,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Fallback: render full HTML page for direct browser visits
  return new Response(
    renderPage({
      subject: send.subject,
      bodyHtml,
      siteName,
      sentAt: send.sent_at,
    }),
    { headers: htmlHeaders },
  );
});

// ── Page renderer ────────────────────────────────────────────────────

function renderPage(opts: {
  subject: string;
  bodyHtml: string;
  siteName: string;
  sentAt: string | null;
}): string {
  const dateStr = opts.sentAt
    ? new Date(opts.sentAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(opts.subject)} — ${esc(opts.siteName)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f6f9fc;
      color: #1a1a1a;
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 640px;
      margin: 0 auto;
      padding: 40px 20px 60px;
    }
    .back { display: inline-block; margin-bottom: 24px; font-size: 13px; color: #6b7280; text-decoration: none; }
    .back:hover { color: #3b82f6; }
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .meta { font-size: 12px; color: #9ca3af; margin-bottom: 8px; }
    h1 {
      font-size: 28px;
      font-weight: 800;
      color: #0b1220;
      line-height: 1.3;
      margin-bottom: 24px;
    }
    .content { font-size: 16px; color: #374151; }
    .content h2 { font-size: 22px; font-weight: 700; margin: 1.5em 0 0.5em; color: #0b1220; }
    .content h3 { font-size: 18px; font-weight: 700; margin: 1.2em 0 0.4em; color: #0b1220; }
    .content p { margin: 0.6em 0; }
    .content ul, .content ol { padding-left: 1.5em; margin: 0.6em 0; }
    .content blockquote {
      border-left: 3px solid #3b82f6;
      padding-left: 1em;
      margin: 1em 0;
      color: #6b7280;
      font-style: italic;
    }
    .content img { max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0; }
    .content a { color: #3b82f6; text-decoration: underline; text-underline-offset: 2px; }
    .content pre {
      background: #1e1e2e;
      color: #cdd6f4;
      border-radius: 8px;
      padding: 14px 16px;
      overflow-x: auto;
      font-size: 13px;
      margin: 1em 0;
    }
    .content code {
      background: rgba(59,130,246,0.08);
      border-radius: 4px;
      padding: 0.15em 0.35em;
      font-size: 0.9em;
    }
    .content pre code { background: none; padding: 0; font-size: inherit; }
    .footer {
      text-align: center;
      padding: 24px 0 0;
      font-size: 11px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      ${dateStr ? `<div class="meta">${esc(dateStr)}</div>` : ""}
      <h1>${esc(opts.subject)}</h1>
      <div class="content">
        ${sanitizeHtml(opts.bodyHtml)}
      </div>
    </div>
    <div class="footer">${esc(opts.siteName)}</div>
  </div>
</body>
</html>`;
}

function errorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Not Found</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f6f9fc; color: #6b7280; }
    .msg { text-align: center; }
    h1 { font-size: 48px; font-weight: 800; color: #d1d5db; margin-bottom: 8px; }
    p { font-size: 16px; }
  </style>
</head>
<body>
  <div class="msg">
    <h1>404</h1>
    <p>${esc(message)}</p>
  </div>
</body>
</html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sanitize HTML to prevent XSS.
 * Strips <script>, <iframe>, on* event handlers, and javascript: URLs.
 */
function sanitizeHtml(html: string): string {
  return html
    // Remove <script> tags and contents
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, "")
    // Remove <iframe> tags
    .replace(/<iframe[\s>][\s\S]*?<\/iframe>/gi, "")
    // Remove standalone <script> or <iframe> tags (unclosed)
    .replace(/<\/?(script|iframe)\b[^>]*>/gi, "")
    // Remove on* event handlers (onclick, onerror, etc.)
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
    // Remove javascript: URLs
    .replace(/href\s*=\s*["']?\s*javascript:/gi, 'href="')
    .replace(/src\s*=\s*["']?\s*javascript:/gi, 'src="');
}
