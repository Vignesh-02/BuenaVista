/**
 * HTML email templates (inline styles for email client compatibility).
 * Theme: orange and black.
 */

const ORANGE = "#e85d04";
const BLACK = "#0a0a0a";
const BLACK_SOFT = "#1a1a1a";
const WHITE = "#ffffff";
const GRAY_LIGHT = "#f5f5f5";
const GRAY_TEXT = "#6b6b6b";

function getOnboardingHtml(username, appUrl = "https://buenavista.in") {
    const safeName = username ? String(username).replace(/[<>"&]/g, "") : "Explorer";
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to BuenaVista</title>
</head>
<body style="margin:0; padding:0; background-color:#e5e5e5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#e5e5e5;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto;">
          <!-- Header -->
          <tr>
            <td style="background-color: ${BLACK}; padding: 28px 32px; border-radius: 12px 12px 0 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin:0; font-size: 26px; font-weight: 700; color: ${WHITE}; letter-spacing: -0.5px;">BuenaVista</h1>
                    <p style="margin: 6px 0 0 0; font-size: 13px; color: ${ORANGE}; font-weight: 600; letter-spacing: 0.5px;">DISCOVER AMAZING LOCATIONS</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color: ${WHITE}; padding: 40px 32px; border-left: 1px solid #eee; border-right: 1px solid #eee;">
              <p style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: ${BLACK}; line-height: 1.4;">Hola, ${safeName}!</p>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #333; line-height: 1.6;">Welcome to BuenaVista. We're glad you're here.</p>
              <p style="margin: 0 0 28px 0; font-size: 15px; color: ${GRAY_TEXT}; line-height: 1.6;">Discover stunning places shared by explorers around the world — and add your own. One community, endless adventures.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0;">
                <tr>
                  <td style="border-radius: 8px; background-color: ${ORANGE};">
                    <a href="${appUrl}/locations" target="_blank" rel="noopener" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: ${WHITE}; text-decoration: none;">Explore locations →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: ${BLACK_SOFT}; padding: 24px 32px; border-radius: 0 0 12px 12px; border: 1px solid #2a2a2a;">
              <p style="margin: 0; font-size: 12px; color: #999;">You're receiving this because you signed up at BuenaVista.</p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">© BuenaVista · Share. Explore. Connect.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function getLocationCreatedHtml(username, locationName, viewUrl) {
    const safeName = username ? String(username).replace(/[<>"&]/g, "") : "Explorer";
    const safeLocationName = escapeHtml(locationName || "Your location");
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your post is live — BuenaVista</title>
</head>
<body style="margin:0; padding:0; background-color:#e5e5e5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#e5e5e5;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto;">
          <tr>
            <td style="background-color: ${BLACK}; padding: 28px 32px; border-radius: 12px 12px 0 0;">
              <h1 style="margin:0; font-size: 26px; font-weight: 700; color: ${WHITE}; letter-spacing: -0.5px;">BuenaVista</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: ${ORANGE}; font-weight: 600; letter-spacing: 0.5px;">YOUR POST IS LIVE</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: ${WHITE}; padding: 40px 32px; border-left: 1px solid #eee; border-right: 1px solid #eee;">
              <p style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: ${BLACK}; line-height: 1.4;">Hey ${safeName}, your post is live.</p>
              <p style="margin: 0 0 12px 0; font-size: 18px; color: ${ORANGE}; font-weight: 600;">"${safeLocationName}"</p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #333; line-height: 1.6;">Other explorers can now discover it, like it, and leave comments. You're building the map together.</p>
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 8px; background-color: ${ORANGE};">
                    <a href="${viewUrl}" target="_blank" rel="noopener" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: ${WHITE}; text-decoration: none;">View your post →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: ${BLACK_SOFT}; padding: 24px 32px; border-radius: 0 0 12px 12px; border: 1px solid #2a2a2a;">
              <p style="margin: 0; font-size: 12px; color: #999;">BuenaVista · Share. Explore. Connect.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function getCommentNotificationHtml(
    recipientName,
    locationName,
    commenterUsername,
    commentText,
    viewUrl
) {
    const safeRecipient = recipientName ? String(recipientName).replace(/[<>"&]/g, "") : "there";
    const safeLocationName = escapeHtml(locationName || "your post");
    const safeCommenter = escapeHtml(commenterUsername || "Someone");
    const safeComment = escapeHtml(commentText || "").replace(/\n/g, "<br>");
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New comment on your post — BuenaVista</title>
</head>
<body style="margin:0; padding:0; background-color:#e5e5e5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#e5e5e5;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto;">
          <tr>
            <td style="background-color: ${BLACK}; padding: 28px 32px; border-radius: 12px 12px 0 0;">
              <h1 style="margin:0; font-size: 26px; font-weight: 700; color: ${WHITE}; letter-spacing: -0.5px;">BuenaVista</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: ${ORANGE}; font-weight: 600; letter-spacing: 0.5px;">YOUR COMMUNITY IS ENGAGING</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: ${WHITE}; padding: 40px 32px; border-left: 1px solid #eee; border-right: 1px solid #eee;">
              <p style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: ${BLACK}; line-height: 1.4;">${safeRecipient}, someone left a comment on your post.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #333; line-height: 1.5;"><strong>"${safeLocationName}"</strong></p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${GRAY_LIGHT}; border-radius: 8px; border-left: 4px solid ${ORANGE}; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; color: ${GRAY_TEXT}; font-weight: 600; text-transform: uppercase;">${safeCommenter} said:</p>
                    <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.6;">${safeComment}</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #333; line-height: 1.6;">Reply and keep the conversation going — your community is growing.</p>
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 8px; background-color: ${ORANGE};">
                    <a href="${viewUrl}" target="_blank" rel="noopener" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: ${WHITE}; text-decoration: none;">View your post →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: ${BLACK_SOFT}; padding: 24px 32px; border-radius: 0 0 12px 12px; border: 1px solid #2a2a2a;">
              <p style="margin: 0; font-size: 12px; color: #999;">BuenaVista · Share. Explore. Connect.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

module.exports = { getOnboardingHtml, getLocationCreatedHtml, getCommentNotificationHtml };
