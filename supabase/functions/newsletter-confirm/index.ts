import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { hmacSign } from "../_shared/email.ts";

// ── Helpers ──────────────────────────────────────────────────────────

function getSiteUrl(): string {
  return (
    Deno.env.get("VITE_SITE_URL") ||
    Deno.env.get("SITE_URL") ||
    "http://localhost:5173"
  ).replace(/\/$/, "");
}

function redirect(status: string): Response {
  const target = `${getSiteUrl()}/confirmed?status=${encodeURIComponent(status)}`;
  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: target },
  });
}

// ── Edge function handler ────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  const expiresStr = url.searchParams.get("expires");
  const token = url.searchParams.get("token");

  if (!email || !expiresStr || !token) {
    return redirect("invalid");
  }

  const expires = Number(expiresStr);
  if (isNaN(expires) || expires < Math.floor(Date.now() / 1000)) {
    return redirect("expired");
  }

  // Verify HMAC
  const secret = Deno.env.get("NEWSLETTER_SECRET");
  if (!secret) {
    console.error("NEWSLETTER_SECRET not set");
    return redirect("error");
  }

  const expectedToken = await hmacSign(`${email}|${expires}`, secret);
  if (token !== expectedToken) {
    return redirect("invalid");
  }

  // Confirm the subscriber
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: subscriber, error: fetchErr } = await supabase
    .from("newsletter_subscribers")
    .select("confirmed_at")
    .eq("email", email)
    .maybeSingle();

  if (fetchErr || !subscriber) {
    return redirect("not-found");
  }

  if (subscriber.confirmed_at) {
    return redirect("already-confirmed");
  }

  const { error: updateErr } = await supabase
    .from("newsletter_subscribers")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("email", email);

  if (updateErr) {
    console.error("Confirm update error:", updateErr);
    return redirect("error");
  }

  return redirect("success");
});
