/**
 * Shared queue processing logic for newsletter emails.
 * Reads messages from the pgmq newsletter_emails queue, sends each email,
 * updates delivery tracking, and finalizes completed sends.
 *
 * Used by both newsletter-worker and newsletter-cron.
 */

import { sendMail, hmacSign, getSiteName } from "./email.ts";
import type { MailAttachment } from "./email.ts";
import { buildEmailHtml } from "./email-html.ts";

const BATCH_SIZE = 10;
const VISIBILITY_TIMEOUT = 120; // seconds before unprocessed messages reappear
const MAX_RUNTIME_MS = 50_000; // stay under edge function timeout
const MAX_RETRIES = 3;

export interface ProcessResult {
  processed: number;
  failed: number;
}

// deno-lint-ignore no-explicit-any
export async function processEmailQueue(supabase: any): Promise<ProcessResult> {
  const siteName = getSiteName();
  const secret = Deno.env.get("NEWSLETTER_SECRET")!;
  const baseUrl =
    Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
  const siteUrl = Deno.env.get("VITE_SITE_URL") || Deno.env.get("SITE_URL") || baseUrl;

  let totalProcessed = 0;
  let totalFailed = 0;
  const completedSendIds = new Set<string>();
  const start = Date.now();

  while (Date.now() - start < MAX_RUNTIME_MS) {
    const { data: messages, error: readErr } = await supabase.rpc(
      "newsletter_queue_read",
      { p_qty: BATCH_SIZE, p_vt: VISIBILITY_TIMEOUT },
    );

    if (readErr || !messages?.length) break;

    // Cache send records per batch to avoid redundant fetches
    // deno-lint-ignore no-explicit-any
    const sendCache: Record<string, any> = {};
    // Cache fetched cover images per send_id
    const coverCache: Record<string, MailAttachment | null> = {};
    // deno-lint-ignore no-explicit-any
    const sendIds = [...new Set(messages.map((m: any) => m.message.send_id))];

    for (const sid of sendIds) {
      if (!sendCache[sid as string]) {
        const { data } = await supabase
          .from("newsletter_sends")
          .select("*")
          .eq("id", sid)
          .single();
        sendCache[sid as string] = data;

        // Pre-fetch cover image if one is set
        if (data?.cover_image) {
          try {
            const imgUrl = resolveCoverUrl(data.cover_image, siteUrl);
            const imgRes = await fetch(imgUrl);
            if (imgRes.ok) {
              const buf = new Uint8Array(await imgRes.arrayBuffer());
              const ct = imgRes.headers.get("content-type") || "image/jpeg";
              const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
              coverCache[sid as string] = {
                filename: `cover.${ext}`,
                content: buf,
                contentType: ct,
                cid: `cover-${sid as string}`,
              };
            } else {
              coverCache[sid as string] = null;
            }
          } catch (e) {
            console.error(`Failed to fetch cover image for send ${sid}:`, e);
            coverCache[sid as string] = null;
          }
        } else {
          coverCache[sid as string] = null;
        }
      }
    }

    for (const msg of messages) {
      const { send_id, subscriber_id, email } = msg.message;
      const send = sendCache[send_id];

      if (!send) {
        // Orphaned message — send record was deleted
        await supabase.rpc("newsletter_queue_delete", {
          p_msg_id: msg.msg_id,
        });
        continue;
      }

      try {
        // Generate per-subscriber HMAC-signed URLs
        const unsubToken = await hmacSign(`unsub|${email}`, secret);
        const unsubUrl =
          `${baseUrl}/functions/v1/newsletter-unsubscribe?` +
          new URLSearchParams({ email, token: unsubToken }).toString();

        const clickToken = await hmacSign(
          `click|${send_id}|${subscriber_id}`,
          secret,
        );
        const readMoreUrl =
          `${siteUrl}/newsletter/${send_id}?` +
          new URLSearchParams({
            sid: subscriber_id,
            token: clickToken,
          }).toString();

        const coverAttachment = coverCache[send_id] || null;

        const emailHtml = buildEmailHtml({
          subject: send.subject,
          excerptHtml: send.excerpt_html,
          readMoreUrl,
          unsubscribeUrl: unsubUrl,
          siteName,
          coverImageCid: coverAttachment?.cid,
        });

        await sendMail({
          to: email,
          subject: send.subject,
          html: emailHtml,
          attachments: coverAttachment ? [coverAttachment] : undefined,
        });

        // Success: mark delivery as sent + remove from queue
        await supabase
          .from("newsletter_deliveries")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempts: Number(msg.read_ct),
          })
          .eq("send_id", send_id)
          .eq("subscriber_id", subscriber_id);

        await supabase.rpc("newsletter_queue_delete", {
          p_msg_id: msg.msg_id,
        });

        totalProcessed++;
        completedSendIds.add(send_id);
      } catch (err) {
        console.error(
          `Failed to send to ${email} (attempt ${msg.read_ct}):`,
          err,
        );

        if (Number(msg.read_ct) >= MAX_RETRIES) {
          // Permanent failure after max retries
          await supabase
            .from("newsletter_deliveries")
            .update({
              status: "failed",
              error: String(err),
              attempts: Number(msg.read_ct),
            })
            .eq("send_id", send_id)
            .eq("subscriber_id", subscriber_id);

          await supabase.rpc("newsletter_queue_archive", {
            p_msg_id: msg.msg_id,
          });

          totalFailed++;
          completedSendIds.add(send_id);
        }
        // else: leave in queue — message reappears after VT for auto-retry
      }
    }
  }

  // Finalize any sends where all deliveries are now resolved
  for (const sendId of completedSendIds) {
    await supabase.rpc("newsletter_finalize_send", {
      p_send_id: sendId,
    });
  }

  return { processed: totalProcessed, failed: totalFailed };
}

/**
 * Resolve a cover_image value to an absolute URL for fetching.
 * Handles relative paths (e.g. "/uploads/img.jpg") and absolute URLs.
 */
function resolveCoverUrl(coverImage: string, siteUrl: string): string {
  if (coverImage.startsWith("http://") || coverImage.startsWith("https://")) {
    return coverImage;
  }
  // Relative path — prepend site URL
  const base = siteUrl.replace(/\/+$/, "");
  const path = coverImage.startsWith("/") ? coverImage : `/${coverImage}`;
  return `${base}${path}`;
}
