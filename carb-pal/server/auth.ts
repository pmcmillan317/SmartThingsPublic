import { db } from "./db";
import { users, accessCodes, insertUserSchema } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import type { Express } from "express";
import { getUncachableResendClient } from "./resend";

const SALT_ROUNDS = 10;

export function registerAuthRoutes(app: Express) {
  // Signup
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password } = insertUserSchema.parse(req.body);

      // Server-side password validation
      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      // Check if user exists
      const existingUser = await db.select().from(users).where(eq(users.email, email));
      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const [user] = await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          isPremium: false,
        })
        .returning();

      // Regenerate session to prevent fixation
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Set session
      req.session.userId = user.id;

      res.json({
        id: user.id,
        email: user.email,
        isPremium: user.isPremium,
        premiumExpiry: user.premiumExpiry,
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(400).json({ error: error.message || "Signup failed" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      // Find user
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Regenerate session to prevent fixation
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Set session
      req.session.userId = user.id;

      res.json({
        id: user.id,
        email: user.email,
        isPremium: user.isPremium,
        premiumExpiry: user.premiumExpiry,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Check session
  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      let [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Check if premium has expired
      if (user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) < new Date()) {
        // Premium expired, downgrade user
        [user] = await db
          .update(users)
          .set({ isPremium: false })
          .where(eq(users.id, userId))
          .returning();
      }

      res.json({
        id: user.id,
        email: user.email,
        isPremium: user.isPremium,
        premiumExpiry: user.premiumExpiry,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  // Redeem access code
  app.post("/api/auth/redeem-code", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Code required" });
      }

      // Find access code
      const [accessCode] = await db
        .select()
        .from(accessCodes)
        .where(and(eq(accessCodes.code, code.toUpperCase()), eq(accessCodes.isRedeemed, false)));

      if (!accessCode) {
        return res.status(404).json({ error: "Invalid or already redeemed code" });
      }

      // Check expiration
      if (accessCode.expiresAt && new Date(accessCode.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Code has expired" });
      }

      // Get current user to check existing expiry
      const [currentUser] = await db.select().from(users).where(eq(users.id, userId));

      // Calculate premium expiry - extend from the later of now or existing expiry
      let premiumExpiry: Date | null = null;
      if (accessCode.durationMonths > 0) {
        const startDate = currentUser.premiumExpiry && new Date(currentUser.premiumExpiry) > new Date()
          ? new Date(currentUser.premiumExpiry)
          : new Date();

        premiumExpiry = new Date(startDate);
        premiumExpiry.setMonth(premiumExpiry.getMonth() + accessCode.durationMonths);
      } // If durationMonths is 0, it's lifetime (null expiry)

      // Update user to premium
      const [updatedUser] = await db
        .update(users)
        .set({
          isPremium: true,
          premiumExpiry,
        })
        .where(eq(users.id, userId))
        .returning();

      // Mark code as redeemed
      await db
        .update(accessCodes)
        .set({
          isRedeemed: true,
          redeemedBy: userId,
          redeemedAt: new Date(),
        })
        .where(eq(accessCodes.id, accessCode.id));

      res.json({
        message: "Premium activated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          isPremium: updatedUser.isPremium,
          premiumExpiry: updatedUser.premiumExpiry,
        },
      });
    } catch (error: any) {
      console.error("Redeem code error:", error);
      res.status(500).json({ error: "Failed to redeem code" });
    }
  });

  // Forgot Password - Request password reset
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email required" });
      }

      // Find user
      const [user] = await db.select().from(users).where(eq(users.email, email));

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If that email exists, a password reset link has been sent" });
      }

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save token to database
      await db
        .update(users)
        .set({
          resetPasswordToken: resetToken,
          resetPasswordExpiry: resetExpiry,
        })
        .where(eq(users.id, user.id));

      // Send reset email
      try {
        const { client, fromEmail } = await getUncachableResendClient();
        const resetUrl = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/reset-password?token=${resetToken}`;

        await client.emails.send({
          from: fromEmail,
          to: email,
          subject: 'Reset Your CarbPal Password',
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #84C318; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                  .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                  .button { display: inline-block; background: #84C318; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                  .footer { color: #666; font-size: 14px; margin-top: 20px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h2 style="margin: 0;">🔐 Reset Your Password</h2>
                  </div>
                  <div class="content">
                    <p>Hi there,</p>
                    <p>We received a request to reset your CarbPal password. Click the button below to create a new password:</p>
                    <a href="${resetUrl}" class="button">Reset Password</a>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                    <div class="footer">
                      <p>This link will expire in 1 hour.</p>
                      <p>If you didn't request this password reset, you can safely ignore this email.</p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
        // Don't reveal email sending failure to user
      }

      res.json({ message: "If that email exists, a password reset link has been sent" });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  // Reset Password - Update password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password required" });
      }

      // Validate password
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      // Find user with valid token
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.resetPasswordToken, token));

      if (!user || !user.resetPasswordExpiry) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (new Date() > new Date(user.resetPasswordExpiry)) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update password and clear reset token
      await db
        .update(users)
        .set({
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpiry: null,
        })
        .where(eq(users.id, user.id));

      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // NOTE: Admin endpoint for generating codes removed for security
  // TODO: Implement proper admin authentication before adding back
}

function generateAccessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  for (let i = 0; i < 4; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return segments.join('-');
}
