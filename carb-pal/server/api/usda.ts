// USDA FoodData Central API Integration

const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_API_URL = "https://api.nal.usda.gov/fdc/v1";

export interface USDAFood {
  fdcId: number;
  description: string;
  foodNutrients: Array<{
    nutrientId: number;
    nutrientName: string;
    value: number;
    unitName: string;
  }>;
}

export interface USDASearchResult {
  foods: USDAFood[];
  totalHits: number;
}

// Restaurant/chain keywords to filter out from USDA results
const RESTAURANT_KEYWORDS = [
  'mcdonald', 'burger king', 'wendy', 'subway', 'taco bell', 'kfc', 'pizza hut',
  'domino', 'papa john', 'chipotle', 'panera', 'starbucks', 'dunkin', 'arby',
  'chick-fil-a', 'sonic', 'dairy queen', 'popeyes', 'five guys', 'panda express',
  'olive garden', 'red lobster', 'applebee', 'chili', 'outback', 'buffalo wild',
  'texas roadhouse', 'cracker barrel', 'ihop', 'denny', 'waffle house', 'restaurant',
  'fast food', 'chain'
];

function isRestaurantItem(description: string): boolean {
  const lowerDesc = description.toLowerCase();
  return RESTAURANT_KEYWORDS.some(keyword => lowerDesc.includes(keyword));
}

export async function searchUSDAFoods(query: string, pageSize: number = 25): Promise<USDASearchResult> {
  if (!USDA_API_KEY) {
    throw new Error("USDA API key not configured");
  }

  const url = `${USDA_API_URL}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=Foundation,SR%20Legacy`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`USDA API error: ${response.statusText}`);
    }
    const data = await response.json();

    // Filter out restaurant/chain items
    const filteredFoods = data.foods.filter((food: USDAFood) => !isRestaurantItem(food.description));

    return {
      ...data,
      foods: filteredFoods,
      totalHits: filteredFoods.length
    };
  } catch (error) {
    console.error("USDA API error:", error);
    throw error;
  }
}

export function extractCarbRatio(food: USDAFood): number {
  // Find total carbohydrate nutrient (ID: 1005)
  const carbNutrient = food.foodNutrients.find(
    n => n.nutrientId === 1005 || n.nutrientName.toLowerCase().includes('carbohydrate')
  );

  if (carbNutrient && carbNutrient.value) {
    // Convert grams per 100g to ratio
    return carbNutrient.value / 100;
  }

  return 0;
}
