import { Router } from "express";
import { storage } from "../storage";
import { searchUSDAFoods, extractCarbRatio } from "../api/usda";
import { searchFatSecretFoods, extractCarbsFromDescription, searchBrands, getFoodById } from "../api/fatsecret";

const router = Router();

// Food routes
router.get("/api/foods", async (req, res) => {
  try {
    const foods = await storage.getAllFoods();
    res.json(foods);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch foods" });
  }
});

// USDA API Search
router.get("/api/foods/search/usda", async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const results = await searchUSDAFoods(query, 25);
    const foods = results.foods.map(food => ({
      id: `usda-${food.fdcId}`,
      name: food.description,
      category: "Other" as const,
      carbRatio: extractCarbRatio(food),
    }));

    res.json(foods);
  } catch (error: any) {
    // console.error("USDA search error:", error);
    res.status(500).json({ error: "USDA API search failed", message: error.message });
  }
});

// FatSecret API Search
router.get("/api/foods/search/fatsecret", async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const results = await searchFatSecretFoods(query, 20);
    // console.log("FatSecret API raw response:", JSON.stringify(results, null, 2));
    const foods: any[] = [];

    if (results.foods && results.foods.food) {
      const foodArray = Array.isArray(results.foods.food)
        ? results.foods.food
        : [results.foods.food];

      // console.log(`FatSecret found ${foodArray.length} foods for query "${query}"`);
      foodArray.forEach(food => {
        const parsedInfo = extractCarbsFromDescription(food.food_description);
        foods.push({
          id: `fatsecret-${food.food_id}`,
          name: food.brand_name ? `${food.brand_name} ${food.food_name}` : food.food_name,
          category: "Other" as const,
          ...parsedInfo, // Spread carbRatio, servingSize, servingCarbs, isBranded
        });
      });
    } else {
      // console.log(`FatSecret returned no foods for query "${query}"`);
    }

    res.json(foods);
  } catch (error: any) {
    // console.error("FatSecret search error:", error);
    res.status(500).json({ error: "FatSecret API search failed", message: error.message });
  }
});

// Brand/Restaurant Search - returns brands with menu items
router.get("/api/brands/search", async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const brands = await searchBrands(query);
    res.json(brands);
  } catch (error: any) {
    // console.error("Brand search error:", error);
    res.status(500).json({ error: "Brand search failed", message: error.message });
  }
});

// Get specific food item details
router.get("/api/brands/food/:id", async (req, res) => {
  try {
    const foodId = req.params.id;
    const food = await getFoodById(foodId);
    res.json(food);
  } catch (error: any) {
    // console.error("Food detail error:", error);
    // Return 404 if food not found, 500 for other errors
    const statusCode = error.message?.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: "Failed to fetch food details", message: error.message });
  }
});

router.get("/api/foods/:id", async (req, res) => {
  try {
    const food = await storage.getFoodById(req.params.id);
    if (!food) {
      return res.status(404).json({ error: "Food not found" });
    }
    res.json(food);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch food" });
  }
});

export const foodRouter = router;
