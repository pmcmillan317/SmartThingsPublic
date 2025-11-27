import { type Food, type InsertFood, type MealLog, type InsertMealLog, type DailySummary, foods, mealLogs } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import foodsData from "./data/foods.json";

export interface IStorage {
  // Food operations
  getAllFoods(): Promise<Food[]>;
  getFoodById(id: string): Promise<Food | undefined>;

  // Meal log operations
  createMealLog(log: InsertMealLog): Promise<MealLog>;
  getMealLogsByDate(date: string): Promise<MealLog[]>;
  getRecentMealLogs(limit: number): Promise<MealLog[]>;
  deleteMealLog(id: string): Promise<boolean>;

  // Summary operations
  getDailySummary(date: string): Promise<DailySummary>;
}

export class DatabaseStorage implements IStorage {

  constructor() {
    this.initializeFoods();
  }

  private async initializeFoods() {
    // Check if foods exist
    const count = await db.select({ count: sql<number>`count(*)` }).from(foods);
    if (Number(count[0].count) === 0) {
      console.log("Seeding foods database...");
      // Seed foods
      const values = foodsData.map((foodData: any) => ({
        name: foodData.name,
        category: foodData.category,
        carbRatio: foodData.carbRatio,
        externalId: `init-${Math.random().toString(36).substring(7)}`, // generate a pseudo ID for initial data
        isBranded: false
      }));

      // Batch insert if needed, but foodsData is small enough
      await db.insert(foods).values(values);
      console.log("Foods seeded.");
    }
  }

  async getAllFoods(): Promise<Food[]> {
    const dbFoods = await db.select().from(foods).orderBy(foods.name);
    return dbFoods.map(f => ({
      id: String(f.id),
      name: f.name,
      category: f.category as any,
      carbRatio: f.carbRatio,
      servingSize: f.servingSize,
      servingCarbs: f.servingCarbs,
      isBranded: f.isBranded
    }));
  }

  async getFoodById(id: string): Promise<Food | undefined> {
    const numericId = parseInt(id);
    if (isNaN(numericId)) return undefined;

    const [food] = await db.select().from(foods).where(eq(foods.id, numericId));
    if (!food) return undefined;

    return {
      id: String(food.id),
      name: food.name,
      category: food.category as any,
      carbRatio: food.carbRatio,
      servingSize: food.servingSize,
      servingCarbs: food.servingCarbs,
      isBranded: food.isBranded
    };
  }

  async createMealLog(insertLog: InsertMealLog): Promise<MealLog> {
    const now = new Date();
    const date = now.toISOString().split("T")[0];

    const [log] = await db.insert(mealLogs).values({
      ...insertLog,
      timestamp: now,
      date: date,
    }).returning();

    return {
      id: log.id,
      foodId: log.foodId,
      foodName: log.foodName,
      category: log.category,
      weight: log.weight,
      carbsCalculated: log.carbsCalculated,
      mealType: log.mealType as any,
      timestamp: log.timestamp.toISOString(),
      date: log.date
    };
  }

  async getMealLogsByDate(date: string): Promise<MealLog[]> {
    const logs = await db.select()
      .from(mealLogs)
      .where(eq(mealLogs.date, date))
      .orderBy(desc(mealLogs.timestamp));

    return logs.map(log => ({
      id: log.id,
      foodId: log.foodId,
      foodName: log.foodName,
      category: log.category,
      weight: log.weight,
      carbsCalculated: log.carbsCalculated,
      mealType: log.mealType as any,
      timestamp: log.timestamp.toISOString(),
      date: log.date
    }));
  }

  async getRecentMealLogs(limit: number = 10): Promise<MealLog[]> {
    const logs = await db.select()
      .from(mealLogs)
      .orderBy(desc(mealLogs.timestamp))
      .limit(limit);

    return logs.map(log => ({
      id: log.id,
      foodId: log.foodId,
      foodName: log.foodName,
      category: log.category,
      weight: log.weight,
      carbsCalculated: log.carbsCalculated,
      mealType: log.mealType as any,
      timestamp: log.timestamp.toISOString(),
      date: log.date
    }));
  }

  async deleteMealLog(id: string): Promise<boolean> {
    const numericId = parseInt(id);
    if (isNaN(numericId)) return false;

    const result = await db.delete(mealLogs).where(eq(mealLogs.id, numericId)).returning();
    return result.length > 0;
  }

  async getDailySummary(date: string): Promise<DailySummary> {
    const logs = await this.getMealLogsByDate(date);

    const breakdown = {
      Breakfast: 0,
      Lunch: 0,
      Dinner: 0,
      Snack: 0,
    };

    let totalCarbs = 0;

    logs.forEach((log) => {
      totalCarbs += log.carbsCalculated;
      if (log.mealType in breakdown) {
        breakdown[log.mealType as keyof typeof breakdown] += log.carbsCalculated;
      }
    });

    return {
      date,
      totalCarbs,
      mealCount: logs.length,
      breakdown,
    };
  }
}

export const storage = new DatabaseStorage();
