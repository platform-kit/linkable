import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAdminToken } from "../_shared/admin-auth.ts";

/**
 * Newsletter broadcast edge function — queue-based.
 * Enqueues emails for all confirmed subscribers via pgmq.
 * Actual sending is handled by newsletter-worker.
 *
 * POST /newsletter-send
 *   Header: x-admin-token: <encrypted-token>
 *   { sendId: "uuid" }
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  const token = req.headers.get("x-admin-token") || "";
  if (!token || !(await verifyAdminToken(token))) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers },
    );
  }

  try {
    const { sendId } = await req.json();
    if (!sendId || typeof sendId !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing sendId" }),
        { status: 400, headers },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch the send record
    const { data: send, error: sendErr } = await supabase
      .from("newsletter_sends")
      .select("*")
      .eq("id", sendId)
      .single();

    if (sendErr || !send) {
      return new Response(
        JSON.stringify({ error: "Send not found" }),
        { status: 404, headers },
      );
    }

    if (send.status === "sent" || send.status === "sending") {
      return new Response(
        JSON.stringify({ error: `Already ${send.status}` }),
        { status: 400, headers },
      );
    }

    // Mark as sending
    await supabase
      .from("newsletter_sends")
      .update({ status: "sending" })
      .eq("id", sendId);

    // Enqueue all confirmed subscribers in a single DB call
    const { data: queued, error: enqueueErr } = await supabase.rpc(
      "newsletter_enqueue_send",
      { p_send_id: sendId },
    );

    if (enqueueErr) {
      console.error("Enqueue error:", enqueueErr);
      // Revert status
      await supabase
        .from("newsletter_sends")
        .update({ status: send.status })
        .eq("id", sendId);
      return new Response(
        JSON.stringify({ error: "Failed to enqueue emails" }),
        { status: 500, headers },
      );
    }

    return new Response(
      JSON.stringify({ success: true, queued: queued || 0 }),
      { headers },
    );
  } catch (err) {
    console.error("newsletter-send error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers },
    );
  }
});
