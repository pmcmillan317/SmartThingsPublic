import { z } from "zod";
import { pgTable, serial, varchar, text, boolean, timestamp, integer, doublePrecision, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Database tables (Drizzle ORM)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  isPremium: boolean("is_premium").notNull().default(false),
  premiumExpiry: timestamp("premium_expiry"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpiry: timestamp("reset_password_expiry"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accessCodes = pgTable("access_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  isRedeemed: boolean("is_redeemed").notNull().default(false),
  redeemedBy: integer("redeemed_by").references(() => users.id),
  redeemedAt: timestamp("redeemed_at"),
  expiresAt: timestamp("expires_at"),
  durationMonths: integer("duration_months").notNull().default(1), // 0 for lifetime
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const suggestions = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  suggestion: text("suggestion").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const foods = pgTable("foods", {
  id: serial("id").primaryKey(), // Using serial for internal DB ID, though external refs might use strings if they come from APIs. But here we store "custom" or cached foods.
  // Wait, the original In-Memory storage mixed static JSON foods with potentially other foods?
  // Actually, MemStorage loaded foods from `data/foods.json` into memory.
  // If we move to DB, we should seed `foods` table with `data/foods.json`.
  externalId: varchar("external_id", { length: 255 }), // e.g. "usda-123" or just UUID for internal
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // Enum as string
  carbRatio: doublePrecision("carb_ratio").notNull(),
  servingSize: varchar("serving_size", { length: 255 }),
  servingCarbs: doublePrecision("serving_carbs"),
  isBranded: boolean("is_branded").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mealLogs = pgTable("meal_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // Ideally link to user, but current MemStorage didn't track user?
  // Wait, current app has authentication. But MemStorage didn't use userId!
  // This means all users shared the same meal logs in the current implementation?
  // Or maybe it was single user?
  // server/routes.ts: `app.post("/api/meals", ...)` -> `storage.createMealLog`
  // It doesn't pass userId.
  // If I add DB storage, I should probably link it to the user if auth is enabled.
  // However, to keep it simple and consistent with current behavior (which might be flawed), I'll stick to the schema but maybe leave userId nullable or just ignore it for now if I can't easily change the API contract.
  // But for a "best it can be" refactor, I SHOULD add userId.
  // But `insertMealLogSchema` doesn't have userId. I can get it from session.

  foodId: varchar("food_id", { length: 255 }).notNull(),
  foodName: varchar("food_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  weight: doublePrecision("weight").notNull(),
  carbsCalculated: doublePrecision("carbs_calculated").notNull(),
  mealType: varchar("meal_type", { length: 20 }).notNull(), // Breakfast, Lunch, etc.
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
});

// Zod schemas from Drizzle tables
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  isPremium: true,
  premiumExpiry: true,
});

export const insertAccessCodeSchema = createInsertSchema(accessCodes).omit({
  id: true,
  createdAt: true,
  isRedeemed: true,
  redeemedBy: true,
  redeemedAt: true,
});

export const insertSuggestionSchema = createInsertSchema(suggestions).omit({
  id: true,
  createdAt: true,
});

export const insertFoodDbSchema = createInsertSchema(foods).omit({
  id: true,
  createdAt: true
});

export const insertMealLogDbSchema = createInsertSchema(mealLogs).omit({
  id: true,
  timestamp: true
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type AccessCode = typeof accessCodes.$inferSelect;
export type InsertAccessCode = z.infer<typeof insertAccessCodeSchema>;
export type Suggestion = typeof suggestions.$inferSelect;
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;

// Food database schema (keeping original interfaces for compatibility)
export const foodSchema = z.object({
  id: z.string(), // The application expects string IDs
  name: z.string(),
  category: z.enum(["Fruits", "Vegetables", "Nuts/Seeds", "Grains/Snacks", "Other"]),
  carbRatio: z.number(), // grams of carbs per gram of food
  servingSize: z.string().optional().nullable(),
  servingCarbs: z.number().optional().nullable(),
  isBranded: z.boolean().optional().nullable(),
});

export const insertFoodSchema = foodSchema.omit({ id: true });

export type Food = z.infer<typeof foodSchema>;
export type InsertFood = z.infer<typeof insertFoodSchema>;

// Meal log schema (Application layer)
export const mealLogSchema = z.object({
  id: z.number(), // DB ID is number
  foodId: z.string(),
  foodName: z.string(),
  category: z.string(),
  weight: z.number(), // in grams
  carbsCalculated: z.number(), // calculated total carbs
  mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
  timestamp: z.string(), // ISO date string
  date: z.string(), // YYYY-MM-DD for grouping by day
});

export const insertMealLogSchema = z.object({
  foodId: z.string(),
  foodName: z.string(),
  category: z.string(),
  weight: z.number().positive("Weight must be greater than 0"),
  carbsCalculated: z.number(),
  mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
});

export type MealLog = z.infer<typeof mealLogSchema>;
export type InsertMealLog = z.infer<typeof insertMealLogSchema>;

// Daily summary schema
export interface DailySummary {
  date: string; // YYYY-MM-DD
  totalCarbs: number;
  mealCount: number;
  breakdown: {
    Breakfast: number;
    Lunch: number;
    Dinner: number;
    Snack: number;
  };
}

// Categories for filtering
export const CATEGORIES = [
  "Fruits",
  "Vegetables",
  "Nuts/Seeds",
  "Grains/Snacks",
  "Other"
] as const;

export type Category = typeof CATEGORIES[number];
