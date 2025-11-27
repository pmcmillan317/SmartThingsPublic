import { Router } from "express";
import { storage } from "../storage";
import { insertMealLogSchema } from "@shared/schema";

const router = Router();

// Meal log routes
router.post("/api/meals", async (req, res) => {
  try {
    const validatedData = insertMealLogSchema.parse(req.body);
    const log = await storage.createMealLog(validatedData);
    res.status(201).json(log);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid meal data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create meal log" });
  }
});

router.get("/api/meals/recent", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const logs = await storage.getRecentMealLogs(limit);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch recent meals" });
  }
});

router.get("/api/meals/:date", async (req, res) => {
  try {
    const logs = await storage.getMealLogsByDate(req.params.date);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch meals" });
  }
});

router.delete("/api/meals/:id", async (req, res) => {
  try {
    const deleted = await storage.deleteMealLog(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Meal log not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete meal log" });
  }
});

// Summary routes
router.get("/api/summary/:date", async (req, res) => {
  try {
    const summary = await storage.getDailySummary(req.params.date);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

export const mealRouter = router;
