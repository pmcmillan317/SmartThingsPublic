import { Router } from "express";
import { db } from "../db";
import { insertSuggestionSchema, suggestions } from "@shared/schema";
import { getUncachableResendClient } from "../resend";

const router = Router();

// Suggestions route
router.post("/api/suggestions", async (req, res) => {
  try {
    const data = insertSuggestionSchema.parse(req.body);

    const [suggestion] = await db.insert(suggestions).values({
      name: data.name || null,
      email: data.email || null,
      suggestion: data.suggestion,
    }).returning();

    // Send email notification to admin
    try {
      const adminEmail = process.env.SUGGESTION_EMAIL;
      if (adminEmail) {
        const { client, fromEmail } = await getUncachableResendClient();

        // Escape HTML to prevent injection attacks
        const escapeHtml = (text: string) => {
          return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        };

        const escapedSuggestion = escapeHtml(data.suggestion);
        const escapedName = data.name ? escapeHtml(data.name) : 'Anonymous';
        const escapedEmail = data.email ? escapeHtml(data.email) : '';

        const submitterInfo = data.name || data.email
          ? `From: ${escapedName} ${escapedEmail ? `(${escapedEmail})` : ''}`
          : 'From: Anonymous user';

        const timestamp = new Date().toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        });

        await client.emails.send({
          from: fromEmail,
          to: adminEmail,
          subject: '💡 New CarbPal Suggestion',
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #84C318; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                  .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
                  .suggestion { background: white; padding: 15px; border-left: 4px solid #84C318; margin: 15px 0; border-radius: 4px; }
                  .meta { color: #666; font-size: 14px; margin-top: 10px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h2 style="margin: 0;">New Suggestion Received</h2>
                  </div>
                  <div class="content">
                    <div class="suggestion">
                      <p style="margin: 0 0 10px 0; font-weight: 500;">Suggestion:</p>
                      <p style="margin: 0; white-space: pre-wrap;">${escapedSuggestion}</p>
                    </div>
                    <div class="meta">
                      <p style="margin: 5px 0;">${submitterInfo}</p>
                      <p style="margin: 5px 0;">Submitted: ${timestamp}</p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `
        });
        // console.log(`✉️ Email notification sent successfully to ${adminEmail}`, result);
      }
    } catch (emailError) {
      // console.error("Failed to send email notification:", emailError);
      // Don't fail the request if email fails
    }

    res.json({ success: true, id: suggestion.id });
  } catch (error: any) {
    // console.error("Suggestion submission error:", error);
    res.status(400).json({ error: error.message || "Failed to submit suggestion" });
  }
});

export const suggestionRouter = router;
