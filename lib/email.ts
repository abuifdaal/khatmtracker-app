// lib/email.ts
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "";
const fromAddress =
  process.env.EMAIL_FROM || "khatmtracker <onboarding@resend.dev>"; // replace later with your domain

// Create the client only if we have a key, so local dev won't crash
const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Sends the private manage link to a pledger via email.
 * - Safe: does nothing if no API key or no recipient email is provided.
 */
export async function sendManageLinkEmail(to: string | null | undefined, manageUrl: string, khatamTitle: string) {
  if (!to || !resend) return; // no-op if missing
  const subject = `Your pledge – ${khatamTitle}`;
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;">
      <h2>Your pledge</h2>
      <p>Use the private link below to update your pledge before the deadline.</p>
      <p><a href="${manageUrl}" target="_blank" rel="noreferrer">${manageUrl}</a></p>
      <hr/>
      <small>Keep this link private.</small>
    </div>
  `;

  await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    html,
  });
}