// FatSecret Platform API Integration using OAuth 2.0 Client Credentials
const FATSECRET_CLIENT_ID = process.env.FATSECRET_CONSUMER_KEY; // Same as consumer key
const FATSECRET_CLIENT_SECRET = process.env.FATSECRET_CONSUMER_SECRET;
const FATSECRET_API_URL = "https://platform.fatsecret.com/rest/server.api";
const FATSECRET_TOKEN_URL = "https://oauth.fatsecret.com/connect/token";

export interface FatSecretFood {
  food_id: string;
  food_name: string;
  food_description: string;
  brand_name?: string;
  food_type?: string;
}

export interface FatSecretSearchResult {
  foods?: {
    food: FatSecretFood[] | FatSecretFood;
  };
}

export interface BrandMenuItem {
  food_id: string;
  item_name: string;
  carbs: number;
  serving_size: string;
}

export interface Brand {
  brand_name: string;
  item_count: number;
  menu_items: BrandMenuItem[];
}

// Simple in-memory token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  if (!FATSECRET_CLIENT_ID || !FATSECRET_CLIENT_SECRET) {
    throw new Error("FatSecret API credentials not configured");
  }

  // Request new access token
  const auth = Buffer.from(`${FATSECRET_CLIENT_ID}:${FATSECRET_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(FATSECRET_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=basic',
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Use proper logging mechanism in production
    // console.error("FatSecret OAuth2 token error:", response.status, errorText.substring(0, 500));
    throw new Error(`Failed to get FatSecret access token: ${response.statusText}`);
  }

  const data = await response.json();

  // Cache the token (expires in 86400 seconds = 24 hours, we'll refresh 1 hour early)
  const expiresIn = data.expires_in || 86400;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (expiresIn - 3600) * 1000, // Refresh 1 hour early
  };

  return data.access_token;
}

export async function searchFatSecretFoods(query: string, maxResults: number = 20): Promise<FatSecretSearchResult> {
  const accessToken = await getAccessToken();

  // Build form-encoded body
  const params = new URLSearchParams({
    method: 'foods.search',
    search_expression: query,
    max_results: maxResults.toString(),
    format: 'json',
  });

  const response = await fetch(FATSECRET_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // console.error("FatSecret API HTTP error:", response.status, errorText.substring(0, 500));
    throw new Error(`FatSecret API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

export interface ParsedFoodInfo {
  carbRatio: number;
  servingSize?: string;
  servingCarbs?: number;
  isBranded?: boolean;
}

export function extractCarbsFromDescription(description: string): ParsedFoodInfo {
  // FatSecret formats:
  // Whole foods: "Per 100g - Calories: 52kcal | Fat: 0.17g | Carbs: 13.81g | Protein: 0.26g"
  // Branded foods: "Per 1 sandwich - Calories: 563kcal | Fat: 33g | Carbs: 45g | Protein: 25g"
  // Branded foods: "Per 1 serving (151g) - Calories: 563kcal | Fat: 33g | Carbs: 45g | Protein: 25g"

  const carbMatch = description.match(/Carbs:\s*([\d.]+)g/i);
  if (!carbMatch || !carbMatch[1]) {
    return { carbRatio: 0 };
  }

  const carbs = parseFloat(carbMatch[1]);

  // Check if it's "Per 100g" (whole food) or a branded serving
  const servingMatch = description.match(/Per\s+(.+?)\s+-/i);

  if (servingMatch && servingMatch[1]) {
    const servingText = servingMatch[1].trim();

    // If it's "100g", treat as whole food (carbRatio)
    if (servingText === "100g") {
      return {
        carbRatio: carbs / 100
      };
    }

    // Otherwise, it's a branded food with a specific serving
    return {
      carbRatio: 0, // Will be calculated differently for branded foods
      servingSize: servingText,
      servingCarbs: carbs,
      isBranded: true
    };
  }

  // Default: assume per 100g
  return {
    carbRatio: carbs / 100
  };
}

// Search for branded/restaurant foods and group by brand
export async function searchBrands(query: string): Promise<Brand[]> {
  const accessToken = await getAccessToken();

  // Search for all foods (will filter by brand_name in results)
  const params = new URLSearchParams({
    method: 'foods.search',
    search_expression: query,
    max_results: '50',
    format: 'json',
  });

  const response = await fetch(FATSECRET_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`FatSecret brand search failed: ${response.statusText}`);
  }

  const results = await response.json();

  if (!results.foods || !results.foods.food) {
    return [];
  }

  const foodArray = Array.isArray(results.foods.food)
    ? results.foods.food
    : [results.foods.food];


  // Group items by brand_name
  const brandMap = new Map<string, BrandMenuItem[]>();

  for (const food of foodArray) {
    // Try to get brand from brand_name field, or extract from food_name
    let brandName = food.brand_name;

    // If no brand_name field, try to extract from food_name
    // Common patterns: "McDonald's Big Mac", "Starbucks Latte", "Subway 6-inch"
    if (!brandName && food.food_name) {
      // Check if food_name contains common brand indicators (apostrophe possessive)
      const brandMatch = food.food_name.match(/^([^-]+(?:'s)?)\s+/);
      if (brandMatch) {
        brandName = brandMatch[1].trim();
      }
    }

    if (brandName) {
      const parsedInfo = extractCarbsFromDescription(food.food_description);

      if (!brandMap.has(brandName)) {
        brandMap.set(brandName, []);
      }

      brandMap.get(brandName)!.push({
        food_id: food.food_id,
        item_name: food.food_name,
        carbs: parsedInfo.servingCarbs || 0,
        serving_size: parsedInfo.servingSize || 'per serving',
      });
    }
  }

  // Convert map to array of Brand objects
  const brands: Brand[] = Array.from(brandMap.entries()).map(([brandName, items]) => ({
    brand_name: brandName,
    item_count: items.length,
    menu_items: items,
  }));

  return brands;
}

// Get detailed food information by ID
export async function getFoodById(foodId: string): Promise<BrandMenuItem> {
  const accessToken = await getAccessToken();

  const params = new URLSearchParams({
    method: 'food.get',
    food_id: foodId,
    format: 'json',
  });

  const response = await fetch(FATSECRET_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FatSecret food.get failed: ${response.statusText} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();

  if (!data.food) {
    throw new Error('Food data not found in response');
  }

  const food = data.food;
  const parsedInfo = extractCarbsFromDescription(food.food_description);

  return {
    food_id: food.food_id,
    item_name: food.food_name,
    carbs: parsedInfo.servingCarbs || 0,
    serving_size: parsedInfo.servingSize || 'per serving',
  };
}
