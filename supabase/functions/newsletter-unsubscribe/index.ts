import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { hmacSign, getSiteName } from "../_shared/email.ts";

// ── HTML response helpers ────────────────────────────────────────────

function htmlPage(title: string, body: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
         background:#f6f9fc;display:flex;align-items:center;justify-content:center;
         min-height:100vh;padding:24px}
    .card{background:#fff;border-radius:16px;padding:48px 40px;max-width:440px;
          width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.06)}
    h1{font-size:24px;font-weight:700;color:#0b1220;margin-bottom:12px}
    p{font-size:16px;color:#4b5563;line-height:1.6}
    .icon{font-size:48px;margin-bottom:16px}
    .error h1{color:#dc2626}
  </style>
</head>
<body>${body}</body>
</html>`;
  return new Response(html, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

// ── Edge function handler ────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");

  if (!email || !token) {
    return htmlPage(
      "Invalid Link",
      `<div class="card error">
        <div class="icon">⚠️</div>
        <h1>Invalid Link</h1>
        <p>This unsubscribe link is missing required parameters.</p>
      </div>`,
    );
  }

  // Verify HMAC (no expiry — unsubscribe links never expire)
  const secret = Deno.env.get("NEWSLETTER_SECRET");
  if (!secret) {
    console.error("NEWSLETTER_SECRET not set");
    return htmlPage(
      "Error",
      `<div class="card error">
        <div class="icon">❌</div>
        <h1>Server Error</h1>
        <p>The server is misconfigured. Please contact the site owner.</p>
      </div>`,
    );
  }

  const expectedToken = await hmacSign(`unsub|${email}`, secret);
  if (token !== expectedToken) {
    return htmlPage(
      "Invalid Link",
      `<div class="card error">
        <div class="icon">🔒</div>
        <h1>Invalid Link</h1>
        <p>This unsubscribe link is invalid or has been tampered with.</p>
      </div>`,
    );
  }

  // Update subscriber
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: subscriber } = await supabase
    .from("newsletter_subscribers")
    .select("unsubscribed_at")
    .eq("email", email)
    .maybeSingle();

  if (!subscriber) {
    return htmlPage(
      "Not Found",
      `<div class="card error">
        <div class="icon">🔍</div>
        <h1>Not Found</h1>
        <p>We couldn't find a subscription for this email address.</p>
      </div>`,
    );
  }

  if (subscriber.unsubscribed_at) {
    return htmlPage(
      "Already Unsubscribed",
      `<div class="card">
        <div class="icon">👋</div>
        <h1>Already Unsubscribed</h1>
        <p>You've already been removed from the mailing list.</p>
      </div>`,
    );
  }

  const { error: updateErr } = await supabase
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("email", email);

  if (updateErr) {
    console.error("Unsubscribe error:", updateErr);
    return htmlPage(
      "Error",
      `<div class="card error">
        <div class="icon">❌</div>
        <h1>Something went wrong</h1>
        <p>We couldn't process your unsubscribe request. Please try again later.</p>
      </div>`,
    );
  }

  const siteName = getSiteName();
  return htmlPage(
    "Unsubscribed",
    `<div class="card">
      <div class="icon">👋</div>
      <h1>You've been unsubscribed</h1>
      <p>You will no longer receive emails from ${siteName}. Sorry to see you go!</p>
    </div>`,
  );
});
