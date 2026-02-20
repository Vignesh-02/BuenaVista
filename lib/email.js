/**
 * Send transactional emails via Resend.
 * Uses RESEND_API_KEY from env. Does not throw; logs errors.
 */
const { Resend } = require("resend");
const {
    getOnboardingHtml,
    getLocationCreatedHtml,
    getCommentNotificationHtml,
} = require("./email-templates");

const DEFAULT_APP_URL = process.env.APP_URL || "https://buenavista.in";
const FROM_INFO = "BuenaVista <info@buenavista.in>";
const FROM_WELCOME = "BuenaVista <welcome@buenavista.in>";

function getResend() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;
    return new Resend(apiKey);
}

async function sendOnboardingEmail(email, username, appUrl) {
    const resend = getResend();
    if (!resend || !email) {
        if (!resend) console.warn("RESEND_API_KEY not set; skipping onboarding email.");
        return;
    }
    const safeName = username || "Explorer";
    const baseUrl = appUrl || DEFAULT_APP_URL;
    const { error: mailError } = await resend.emails.send({
        from: FROM_WELCOME,
        to: email,
        subject: `Hola, ${safeName}! Welcome to BuenaVista`,
        html: getOnboardingHtml(safeName, baseUrl),
        text: `Hola, ${safeName}! Welcome to BuenaVista. We're glad you're here. Discover amazing locations and share your own with explorers around the world. Visit ${baseUrl}/locations to get started.`,
    });
    if (mailError) console.error("Onboarding email error:", mailError);
    else console.log("Onboarding email sent to", email);
}

async function sendLocationCreatedEmail(email, username, locationName, locationId) {
    const resend = getResend();
    if (!resend || !email) return;
    const baseUrl = DEFAULT_APP_URL;
    const viewUrl = `${baseUrl}/locations/${locationId}`;
    const safeName = username || "Explorer";
    const { error: mailError } = await resend.emails.send({
        from: FROM_INFO,
        to: email,
        subject: `Your post "${(locationName || "New location").slice(0, 50)}" is live — BuenaVista`,
        html: getLocationCreatedHtml(safeName, locationName, viewUrl),
        text: `Hey ${safeName}, your post "${locationName || "New location"}" is live. Other explorers can discover it and comment. View it here: ${viewUrl}`,
    });
    if (mailError) console.error("Location-created email error:", mailError);
    else console.log("Location-created email sent to", email);
}

async function sendCommentNotificationEmail(toEmail, recipientUsername, locationName, locationId, commenterUsername, commentText) {
    const resend = getResend();
    if (!resend || !toEmail) return;
    const baseUrl = DEFAULT_APP_URL;
    const viewUrl = `${baseUrl}/locations/${locationId}`;
    const { error: mailError } = await resend.emails.send({
        from: FROM_INFO,
        to: toEmail,
        subject: `${commenterUsername || "Someone"} commented on your post — BuenaVista`,
        html: getCommentNotificationHtml(
            recipientUsername,
            locationName,
            commenterUsername,
            commentText,
            viewUrl
        ),
        text: `${recipientUsername || "There"}, ${commenterUsername || "Someone"} commented on your post "${locationName || "your post"}": "${(commentText || "").slice(0, 100)}..." View and reply: ${viewUrl}`,
    });
    if (mailError) console.error("Comment-notification email error:", mailError);
    else console.log("Comment-notification email sent to", toEmail);
}

module.exports = {
    sendOnboardingEmail,
    sendLocationCreatedEmail,
    sendCommentNotificationEmail,
};
