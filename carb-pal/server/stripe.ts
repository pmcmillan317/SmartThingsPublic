import Stripe from "stripe";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
});

export const STRIPE_PRICE_IDS = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID || "price_monthly",
  yearly: process.env.STRIPE_YEARLY_PRICE_ID || "price_yearly",
};

export async function createCheckoutSession(
  userId: number | null,
  email: string | null,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  let customerId: string | undefined;

  // For authenticated users, get or create customer
  if (userId) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    customerId = user?.stripeCustomerId ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { userId: userId.toString() }
      });

      await db
        .update(users)
        .set({ stripeCustomerId: customer.id })
        .where(eq(users.id, userId));

      customerId = customer.id;
    }
  }

  // Create checkout session
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: userId ? {
      userId: userId.toString(),
    } : {},
  };

  // For authenticated users with customer ID, use it
  if (customerId) {
    sessionParams.customer = customerId;
  }
  // For guests, omit customer parameter - Stripe will automatically create one and collect email

  const session = await stripe.checkout.sessions.create(sessionParams);

  return session;
}

export async function createCustomerPortalSession(
  userId: number,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user?.stripeCustomerId) {
    throw new Error('No Stripe customer found for this user');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: returnUrl,
  });

  return session;
}

export async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  let user = (await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId)))[0];

  // If user not found by customer ID, fetch customer from Stripe and create/link user
  if (!user) {
    console.log(`No user found for customer ${customerId}, fetching from Stripe...`);

    try {
      const customer = await stripe.customers.retrieve(customerId);

      if (!customer || ('deleted' in customer && customer.deleted) || !('email' in customer) || !customer.email) {
        console.error(`Invalid or deleted customer ${customerId}`);
        return;
      }

      // Check if user exists with this email
      const [userByEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, customer.email));

      if (userByEmail) {
        // Link existing user to customer
        await db
          .update(users)
          .set({ stripeCustomerId: customerId })
          .where(eq(users.id, userByEmail.id));

        user = userByEmail;
        console.log(`Linked existing user ${userByEmail.id} to customer ${customerId}`);
      } else {
        // Create new user account
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        const [newUser] = await db
          .insert(users)
          .values({
            email: customer.email,
            password: hashedPassword,
            stripeCustomerId: customerId,
            isPremium: false,
          })
          .returning();

        user = newUser;
        console.log(`Created new user ${newUser.id} for customer ${customerId} (${customer.email})`);
      }
    } catch (error) {
      console.error(`Failed to fetch/create user for customer ${customerId}:`, error);
      return;
    }
  }

  const isPremium = subscription.status === 'active' || subscription.status === 'trialing';
  // Type assertion for current_period_end which exists on Subscription but may not be in type def
  const premiumExpiry = 'current_period_end' in subscription && typeof subscription.current_period_end === 'number'
    ? new Date(subscription.current_period_end * 1000)
    : null;

  await db
    .update(users)
    .set({
      isPremium,
      premiumExpiry,
      stripeSubscriptionId: subscription.id,
    })
    .where(eq(users.id, user.id));

  console.log(`Updated user ${user.id} premium status: ${isPremium}, expiry: ${premiumExpiry}`);
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId));

  if (!user) {
    console.error(`No user found for Stripe customer ${customerId}`);
    return;
  }

  await db
    .update(users)
    .set({
      isPremium: false,
      premiumExpiry: null,
      stripeSubscriptionId: null,
    })
    .where(eq(users.id, user.id));

  console.log(`Removed premium status for user ${user.id}`);
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const customerEmail = session.customer_details?.email;

  if (!customerId || !customerEmail) {
    console.error('Missing customer ID or email in checkout session');
    return;
  }

  // Check if user already exists with this customer ID
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId));

  if (existingUser) {
    console.log(`User ${existingUser.id} already exists for customer ${customerId}`);
    return;
  }

  // Check if user exists with this email
  const [userByEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, customerEmail));

  if (userByEmail) {
    // User exists but doesn't have customer ID - link them
    await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userByEmail.id));

    console.log(`Linked existing user ${userByEmail.id} to customer ${customerId}`);
    return;
  }

  // Create new user account for guest checkout
  // Generate a secure random password (user can reset it via forgot password)
  const randomPassword = crypto.randomBytes(32).toString('hex');
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  const [newUser] = await db
    .insert(users)
    .values({
      email: customerEmail,
      password: hashedPassword,
      stripeCustomerId: customerId,
      isPremium: false, // Will be set to true by subscription.created event
    })
    .returning();

  console.log(`Created new user ${newUser.id} for customer ${customerId} (${customerEmail})`);
}
