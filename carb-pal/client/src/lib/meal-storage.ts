import { type MealLog } from "@shared/schema";

const STORAGE_KEY = "carb-tracker-meals";

export const mealStorage = {
  // Load all meal logs from localStorage
  loadMeals(): MealLog[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error("Failed to load meals from localStorage:", error);
      return [];
    }
  },

  // Save all meal logs to localStorage
  saveMeals(meals: MealLog[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
    } catch (error) {
      console.error("Failed to save meals to localStorage:", error);
    }
  },

  // Add a new meal log
  addMeal(meal: MealLog): void {
    const meals = this.loadMeals();
    meals.push(meal);
    this.saveMeals(meals);
  },

  // Delete a meal log by ID
  deleteMeal(id: string): void {
    const meals = this.loadMeals();
    const filtered = meals.filter((meal) => meal.id !== id);
    this.saveMeals(filtered);
  },

  // Get meals for a specific date
  getMealsByDate(date: string): MealLog[] {
    const meals = this.loadMeals();
    return meals.filter((meal) => meal.date === date)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  // Get recent meals (today's meals)
  getRecentMeals(limit: number = 10): MealLog[] {
    const today = new Date().toISOString().split("T")[0];
    const meals = this.getMealsByDate(today);
    return meals.slice(0, limit);
  },

  // Clear all meals (for testing)
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};
