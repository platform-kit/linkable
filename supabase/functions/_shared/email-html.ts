/**
 * Shared email HTML builder for newsletter broadcasts.
 * Used by newsletter-worker and newsletter-cron.
 */

export function buildEmailHtml(opts: {
  subject: string;
  excerptHtml: string;
  readMoreUrl: string;
  unsubscribeUrl: string;
  siteName: string;
  coverImageCid?: string;
}): string {
  const coverBlock = opts.coverImageCid
    ? `<img src="cid:${escapeAttr(opts.coverImageCid)}" alt="" width="480" style="display:block;width:100%;max-width:480px;height:auto;border-radius:12px 12px 0 0;" />`
    : "";

  const topPadding = opts.coverImageCid ? "20px" : "40px";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f9fc;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;margin:0 auto;">
          <tr>
            <td style="background:#ffffff;border-radius:12px;overflow:hidden;">
              ${coverBlock}
              <div style="padding:${topPadding} 40px 40px;">
              <h1 style="font-size:22px;font-weight:700;color:#0b1220;margin:0 0 20px;line-height:1.3;">
                ${escapeHtml(opts.subject)}
              </h1>
              <div style="font-size:15px;color:#374151;line-height:24px;margin:0 0 28px;">
                ${opts.excerptHtml}
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:9999px;background:#3b82f6;">
                    <a href="${escapeAttr(opts.readMoreUrl)}"
                       style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                      Read more
                    </a>
                  </td>
                </tr>
              </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 0 0;text-align:center;">
              <p style="font-size:11px;color:#9ca3af;line-height:16px;margin:0;">
                You're receiving this because you subscribed to ${escapeHtml(opts.siteName)}.
                <a href="${escapeAttr(opts.unsubscribeUrl)}" style="color:#9ca3af;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
