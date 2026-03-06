import { createClient } from "jsr:@supabase/supabase-js@2";
import { render } from "npm:@vue-email/render";
import { defineComponent, h } from "npm:vue@3";
import {
  EHtml,
  EHead,
  EBody,
  EText,
  EButton,
  EContainer,
  ESection,
  EPreview,
  EHeading,
  EHr,
} from "npm:vue-email";
import { corsHeaders } from "../_shared/cors.ts";
import { sendMail, hmacSign, getSiteName } from "../_shared/email.ts";

// ── Vue Email confirmation template ──────────────────────────────────

const ConfirmationEmail = defineComponent({
  props: {
    confirmUrl: { type: String, required: true },
    unsubscribeUrl: { type: String, required: true },
    siteName: { type: String, default: "Newsletter" },
  },
  setup(props) {
    return () =>
      h(EHtml, {}, [
        h(EHead),
        h(
          EPreview,
          {},
          () => `Confirm your subscription to ${props.siteName}`,
        ),
        h(
          EBody,
          {
            style: {
              backgroundColor: "#f6f9fc",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              padding: "40px 0",
            },
          },
          () =>
            h(
              EContainer,
              {
                style: {
                  maxWidth: "480px",
                  margin: "0 auto",
                  padding: "0 20px",
                },
              },
              () => [
                h(
                  ESection,
                  {
                    style: {
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      padding: "40px",
                      textAlign: "center" as const,
                    },
                  },
                  () => [
                    h(
                      EHeading,
                      {
                        as: "h1",
                        style: {
                          fontSize: "24px",
                          fontWeight: "700",
                          color: "#0b1220",
                          margin: "0 0 16px",
                        },
                      },
                      () => "You're almost there!",
                    ),
                    h(
                      EText,
                      {
                        style: {
                          fontSize: "16px",
                          color: "#4b5563",
                          lineHeight: "24px",
                          margin: "0 0 24px",
                        },
                      },
                      () =>
                        `Thanks for subscribing to ${props.siteName}. Please confirm your email address by clicking the button below.`,
                    ),
                    h(
                      EButton,
                      {
                        href: props.confirmUrl,
                        style: {
                          backgroundColor: "#3b82f6",
                          color: "#ffffff",
                          padding: "12px 24px",
                          borderRadius: "9999px",
                          fontSize: "14px",
                          fontWeight: "600",
                          textDecoration: "none",
                        },
                      },
                      () => "Confirm subscription",
                    ),
                    h(EHr, {
                      style: {
                        borderColor: "#e5e7eb",
                        margin: "32px 0",
                      },
                    }),
                    h(
                      EText,
                      {
                        style: {
                          fontSize: "12px",
                          color: "#9ca3af",
                          lineHeight: "18px",
                        },
                      },
                      () =>
                        "If you didn't subscribe, you can safely ignore this email. This link will expire in 24 hours.",
                    ),
                  ],
                ),
                h(
                  ESection,
                  {
                    style: {
                      textAlign: "center" as const,
                      padding: "16px 0 0",
                    },
                  },
                  () =>
                    h(
                      EText,
                      {
                        style: {
                          fontSize: "11px",
                          color: "#9ca3af",
                          lineHeight: "16px",
                        },
                      },
                      () => [
                        `You're receiving this because you signed up at ${props.siteName}. `,
                        h(
                          "a",
                          {
                            href: props.unsubscribeUrl,
                            style: { color: "#9ca3af" },
                          },
                          "Unsubscribe",
                        ),
                      ],
                    ),
                ),
              ],
            ),
        ),
      ]);
  },
});

// ── Edge function handler ────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const { email } = await req.json();

    // Validate email
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── Supabase: check / insert ───────────────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await supabase
      .from("newsletter_subscribers")
      .select("confirmed_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing?.confirmed_at) {
      return new Response(
        JSON.stringify({ success: true, alreadyConfirmed: true }),
        { headers },
      );
    }

    if (!existing) {
      const { error: insertErr } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: normalizedEmail });

      if (insertErr) {
        console.error("Insert error:", insertErr);
        return new Response(
          JSON.stringify({ error: "Failed to subscribe" }),
          { status: 500, headers },
        );
      }
    }

    // ── Generate confirmation & unsubscribe links ────────────────────
    const secret = Deno.env.get("NEWSLETTER_SECRET");
    if (!secret) {
      console.error("NEWSLETTER_SECRET not set");
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers },
      );
    }

    const expires = Math.floor(Date.now() / 1000) + 86400; // 24 hours
    const token = await hmacSign(`${normalizedEmail}|${expires}`, secret);

    const baseUrl =
      Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
    const confirmUrl =
      `${baseUrl}/functions/v1/newsletter-confirm?` +
      new URLSearchParams({
        email: normalizedEmail,
        expires: String(expires),
        token,
      }).toString();

    const unsubToken = await hmacSign(`unsub|${normalizedEmail}`, secret);
    const unsubscribeUrl =
      `${baseUrl}/functions/v1/newsletter-unsubscribe?` +
      new URLSearchParams({
        email: normalizedEmail,
        token: unsubToken,
      }).toString();

    // ── Render email with Vue Email ────────────────────────────────
    const siteName = getSiteName();
    const emailHtml = await render(ConfirmationEmail, {
      confirmUrl,
      unsubscribeUrl,
      siteName,
    });

    // ── Send via shared email module ───────────────────────────────
    await sendMail({
      to: normalizedEmail,
      subject: `Confirm your subscription to ${siteName}`,
      html: emailHtml,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers },
    );
  } catch (err) {
    console.error("newsletter-signup error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers },
    );
  }
});
