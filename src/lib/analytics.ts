/**
 * Client-side analytics tracker.
 *
 * Uses FingerprintJS to generate a stable browser fingerprint as a visitor ID.
 * Sends pageview and click events to the Supabase analytics edge function.
 */

import FingerprintJS from "@fingerprintjs/fingerprintjs";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "";
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "";

let fpPromise: Promise<string> | null = null;

/** Returns true if analytics tracking is available (Supabase configured). */
export function isAnalyticsEnabled(): boolean {
  return !!(supabaseUrl && anonKey);
}

/** Lazily initialise FingerprintJS and return the visitor hash. */
function getVisitorId(): Promise<string> {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => {
        return result.visitorId;
      });
  }
  return fpPromise;
}

/** Fire-and-forget: send an analytics event to the edge function. */
async function sendEvent(
  eventType: "pageview" | "click",
  page: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!isAnalyticsEnabled()) return;

  try {
    const vid = await getVisitorId();
    await fetch(`${supabaseUrl}/functions/v1/analytics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        action: "track",
        event_type: eventType,
        page,
        visitor_id: vid,
        referrer: document.referrer || null,
        metadata,
      }),
    });
  } catch {
    // Silently fail — analytics should never break the app
  }
}

/** Track a page view. */
export function trackPageview(page?: string): void {
  sendEvent("pageview", page || window.location.pathname);
}

/** Track a link click. */
export function trackClick(url: string, label?: string): void {
  sendEvent("click", window.location.pathname, { url, label });
}
