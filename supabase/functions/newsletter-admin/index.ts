import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAdminToken } from "../_shared/admin-auth.ts";

/**
 * Admin edge function for newsletter management.
 * Requires an encrypted admin auth token in the x-admin-token header.
 *
 * POST /newsletter-admin
 *   Header: x-admin-token: <encrypted-token>
 *
 * Subscriber actions:
 *   { action: "list" }                    → returns all subscribers
 *   { action: "delete", id: "..." }       → deletes a subscriber by ID
 *
 * Send (broadcast) actions:
 *   { action: "list-sends" }              → returns all sends with click counts
 *   { action: "get-send", id }            → returns a single send with click analytics
 *   { action: "create-send", subject, excerpt_html, body_html }
 *   { action: "update-send", id, subject?, excerpt_html?, body_html?, status?, scheduled_at? }
 *   { action: "delete-send", id }         → deletes a send and its click data
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  // Verify admin auth via custom header (Authorization is used by Supabase for the anon key)
  const token = req.headers.get("x-admin-token") || "";
  if (!token || !(await verifyAdminToken(token))) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers },
    );
  }

  try {
    const body = await req.json();
    const { action, id } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Subscriber actions ───────────────────────────────────────

    if (action === "list") {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("List error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to list subscribers" }),
          { status: 500, headers },
        );
      }

      return new Response(JSON.stringify({ subscribers: data }), { headers });
    }

    if (action === "delete") {
      if (!id || typeof id !== "string") {
        return new Response(
          JSON.stringify({ error: "Missing subscriber id" }),
          { status: 400, headers },
        );
      }

      const { error } = await supabase
        .from("newsletter_subscribers")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Delete error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to delete subscriber" }),
          { status: 500, headers },
        );
      }

      return new Response(JSON.stringify({ success: true }), { headers });
    }

    // ── Send (broadcast) actions ─────────────────────────────────

    if (action === "list-sends") {
      const { data: sends, error } = await supabase
        .from("newsletter_sends")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("List sends error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to list sends" }),
          { status: 500, headers },
        );
      }

      // Get click counts per send in one query
      const sendIds = (sends || []).map((s: { id: string }) => s.id);
      let clickCounts: Record<string, number> = {};
      if (sendIds.length > 0) {
        const { data: clicks } = await supabase
          .from("newsletter_clicks")
          .select("send_id")
          .in("send_id", sendIds);

        if (clicks) {
          for (const c of clicks) {
            clickCounts[c.send_id] = (clickCounts[c.send_id] || 0) + 1;
          }
        }
      }

      const enriched = (sends || []).map((s: Record<string, unknown>) => ({
        ...s,
        click_count: clickCounts[s.id as string] || 0,
      }));

      return new Response(JSON.stringify({ sends: enriched }), { headers });
    }

    if (action === "get-send") {
      if (!id) {
        return new Response(
          JSON.stringify({ error: "Missing send id" }),
          { status: 400, headers },
        );
      }

      const { data: send, error: sendErr } = await supabase
        .from("newsletter_sends")
        .select("*")
        .eq("id", id)
        .single();

      if (sendErr || !send) {
        return new Response(
          JSON.stringify({ error: "Send not found" }),
          { status: 404, headers },
        );
      }

      // Get click details with subscriber emails
      const { data: clicks } = await supabase
        .from("newsletter_clicks")
        .select("id, subscriber_id, clicked_at")
        .eq("send_id", id)
        .order("clicked_at", { ascending: false });

      // Resolve subscriber emails for click records
      const subIds = [
        ...new Set(
          (clicks || [])
            .map((c: { subscriber_id: string | null }) => c.subscriber_id)
            .filter(Boolean),
        ),
      ];

      let emailMap: Record<string, string> = {};
      if (subIds.length > 0) {
        const { data: subs } = await supabase
          .from("newsletter_subscribers")
          .select("id, email")
          .in("id", subIds);
        if (subs) {
          for (const s of subs) {
            emailMap[s.id] = s.email;
          }
        }
      }

      const enrichedClicks = (clicks || []).map(
        (c: {
          id: string;
          subscriber_id: string | null;
          clicked_at: string;
        }) => ({
          ...c,
          email: c.subscriber_id ? emailMap[c.subscriber_id] || null : null,
        }),
      );

      return new Response(
        JSON.stringify({
          send,
          clicks: enrichedClicks,
          click_count: enrichedClicks.length,
          unique_clicks: new Set(
            enrichedClicks
              .map(
                (c: { subscriber_id: string | null }) => c.subscriber_id,
              )
              .filter(Boolean),
          ).size,
        }),
        { headers },
      );
    }

    if (action === "create-send") {
      const { subject, cover_image, excerpt_html, body_html, tags } = body;
      if (!subject || typeof subject !== "string") {
        return new Response(
          JSON.stringify({ error: "Subject is required" }),
          { status: 400, headers },
        );
      }

      const { data, error } = await supabase
        .from("newsletter_sends")
        .insert({
          subject,
          cover_image: cover_image || "",
          excerpt_html: excerpt_html || "",
          body_html: body_html || "",
          tags: Array.isArray(tags) ? tags : [],
          status: "draft",
        })
        .select()
        .single();

      if (error) {
        console.error("Create send error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create send" }),
          { status: 500, headers },
        );
      }

      return new Response(JSON.stringify({ send: data }), { headers });
    }

    if (action === "update-send") {
      if (!id) {
        return new Response(
          JSON.stringify({ error: "Missing send id" }),
          { status: 400, headers },
        );
      }

      const updates: Record<string, unknown> = {};
      if (body.subject !== undefined) updates.subject = body.subject;
      if (body.cover_image !== undefined) updates.cover_image = body.cover_image;
      if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags : [];
      if (body.excerpt_html !== undefined)
        updates.excerpt_html = body.excerpt_html;
      if (body.body_html !== undefined) updates.body_html = body.body_html;
      if (body.status !== undefined) updates.status = body.status;
      if (body.scheduled_at !== undefined)
        updates.scheduled_at = body.scheduled_at;
      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("newsletter_sends")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Update send error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to update send" }),
          { status: 500, headers },
        );
      }

      return new Response(JSON.stringify({ send: data }), { headers });
    }

    if (action === "delete-send") {
      if (!id) {
        return new Response(
          JSON.stringify({ error: "Missing send id" }),
          { status: 400, headers },
        );
      }

      const { error } = await supabase
        .from("newsletter_sends")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Delete send error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to delete send" }),
          { status: 500, headers },
        );
      }

      return new Response(JSON.stringify({ success: true }), { headers });
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers },
    );
  } catch (err) {
    console.error("newsletter-admin error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers },
    );
  }
});
