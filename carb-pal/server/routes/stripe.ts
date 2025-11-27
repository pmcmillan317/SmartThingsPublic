import { Router } from "express";
import { db } from "../db";
import { stripe, createCheckoutSession, createCustomerPortalSession, handleSubscriptionUpdate, handleSubscriptionDeleted, handleCheckoutCompleted, STRIPE_PRICE_IDS } from "../stripe";

const router = Router();

// Stripe checkout session
router.post("/api/stripe/create-checkout-session", async (req, res) => {
  try {
    const userId = req.session.userId || null;
    const { priceId, planType } = req.body;

    if (!priceId || !planType) {
      return res.status(400).json({ error: "Price ID and plan type required" });
    }

    // Validate price ID against known prices
    const validPriceId = planType === 'monthly' ? STRIPE_PRICE_IDS.monthly :
                        planType === 'yearly' ? STRIPE_PRICE_IDS.yearly : null;

    // console.log('Stripe checkout validation:', { ... });

    if (!validPriceId || priceId !== validPriceId) {
      return res.status(400).json({ error: "Invalid price ID for plan type" });
    }

    // Get user email if authenticated
    let userEmail: string | null = null;
    if (userId) {
      const { users } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (user) {
        userEmail = user.email;
      }
    }

    const successUrl = `${req.headers.origin}/settings?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${req.headers.origin}/pricing?canceled=true`;

    const session = await createCheckoutSession(
      userId,
      userEmail,
      validPriceId,
      successUrl,
      cancelUrl
    );

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    // console.error("Checkout session error:", error);
    res.status(500).json({ error: "Failed to create checkout session", message: error.message });
  }
});

// Get Stripe price IDs for frontend
router.get("/api/stripe/price-ids", (req, res) => {
  res.json({
    monthly: STRIPE_PRICE_IDS.monthly,
    yearly: STRIPE_PRICE_IDS.yearly,
  });
});

// Stripe customer portal
router.post("/api/stripe/create-portal-session", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const returnUrl = `${req.headers.origin}/settings`;
    const session = await createCustomerPortalSession(userId, returnUrl);

    res.json({ url: session.url });
  } catch (error: any) {
    // console.error("Portal session error:", error);
    res.status(500).json({ error: "Failed to create portal session", message: error.message });
  }
});

// Stripe webhooks
router.post("/api/stripe/webhook", async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as any);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as any);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as any);
        break;
      default:
        // console.log(`Unhandled event type: ${event.type}`);
        break; // Added break to avoid fallthrough warning (though switch has default)
    }

    res.json({ received: true });
  } catch (error: any) {
    // console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

export const stripeRouter = router;
