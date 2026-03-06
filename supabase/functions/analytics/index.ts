import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAdminToken } from "../_shared/admin-auth.ts";

/**
 * Analytics edge function.
 *
 * POST /analytics
 *
 * Public (no auth):
 *   { action: "track", event_type: "pageview"|"click", page: "/", visitor_id?, referrer?, metadata? }
 *
 * Admin (x-admin-token required):
 *   { action: "query", range: "7d"|"30d"|"90d" }
 *     → returns daily aggregates for pageviews, unique visitors, and clicks
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const body = await req.json();
    const { action } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Track event (public, no auth) ─────────────────────────────

    if (action === "track") {
      const { event_type, page, visitor_id, referrer, metadata } = body;

      if (!event_type || !["pageview", "click"].includes(event_type)) {
        return new Response(
          JSON.stringify({ error: "Invalid event_type" }),
          { status: 400, headers },
        );
      }

      const { error } = await supabase.from("analytics_events").insert({
        event_type,
        page: typeof page === "string" ? page.slice(0, 2048) : "/",
        visitor_id: typeof visitor_id === "string" ? visitor_id.slice(0, 64) : null,
        referrer: typeof referrer === "string" ? referrer.slice(0, 2048) : null,
        user_agent: req.headers.get("user-agent")?.slice(0, 512) || null,
        metadata: metadata && typeof metadata === "object" ? metadata : null,
      });

      if (error) {
        console.error("Track error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to record event" }),
          { status: 500, headers },
        );
      }

      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    // ── Query analytics (admin only) ──────────────────────────────

    if (action === "query") {
      const token = req.headers.get("x-admin-token") || "";
      if (!token || !(await verifyAdminToken(token))) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers },
        );
      }

      const range = body.range || "7d";
      const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;
      const since = new Date();
      since.setDate(since.getDate() - days);

      // Fetch raw events within range
      const { data: events, error } = await supabase
        .from("analytics_events")
        .select("event_type, page, visitor_id, created_at, metadata")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Query error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to query analytics" }),
          { status: 500, headers },
        );
      }

      // Aggregate by day
      const dayMap: Record<string, { pageviews: number; visitors: Set<string>; clicks: number }> = {};

      // Pre-fill all days in range
      for (let d = 0; d < days; d++) {
        const dt = new Date(since);
        dt.setDate(dt.getDate() + d + 1);
        const key = dt.toISOString().slice(0, 10);
        dayMap[key] = { pageviews: 0, visitors: new Set(), clicks: 0 };
      }

      // Also include today
      const todayKey = new Date().toISOString().slice(0, 10);
      if (!dayMap[todayKey]) {
        dayMap[todayKey] = { pageviews: 0, visitors: new Set(), clicks: 0 };
      }

      for (const ev of events || []) {
        const day = ev.created_at.slice(0, 10);
        if (!dayMap[day]) {
          dayMap[day] = { pageviews: 0, visitors: new Set(), clicks: 0 };
        }
        if (ev.event_type === "pageview") {
          dayMap[day].pageviews++;
          if (ev.visitor_id) dayMap[day].visitors.add(ev.visitor_id);
        } else if (ev.event_type === "click") {
          dayMap[day].clicks++;
        }
      }

      // Build sorted series
      const dates = Object.keys(dayMap).sort();
      const series = {
        dates,
        pageviews: dates.map((d) => dayMap[d].pageviews),
        visitors: dates.map((d) => dayMap[d].visitors.size),
        clicks: dates.map((d) => dayMap[d].clicks),
      };

      // Top pages
      const pageCounts: Record<string, number> = {};
      for (const ev of events || []) {
        if (ev.event_type === "pageview") {
          pageCounts[ev.page] = (pageCounts[ev.page] || 0) + 1;
        }
      }
      const topPages = Object.entries(pageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([page, count]) => ({ page, count }));

      // Top clicked links
      const clickCounts: Record<string, number> = {};
      for (const ev of events || []) {
        if (ev.event_type === "click" && ev.metadata?.url) {
          clickCounts[ev.metadata.url] = (clickCounts[ev.metadata.url] || 0) + 1;
        }
      }
      const topClicks = Object.entries(clickCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([url, count]) => ({ url, count }));

      // Summary totals
      const totalPageviews = series.pageviews.reduce((a, b) => a + b, 0);
      const allVisitors = new Set<string>();
      for (const ev of events || []) {
        if (ev.visitor_id) allVisitors.add(ev.visitor_id);
      }
      const totalClicks = series.clicks.reduce((a, b) => a + b, 0);

      return new Response(
        JSON.stringify({
          series,
          topPages,
          topClicks,
          totals: {
            pageviews: totalPageviews,
            visitors: allVisitors.size,
            clicks: totalClicks,
          },
        }),
        { headers },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers },
    );
  } catch (err) {
    console.error("Analytics function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers },
    );
  }
});
