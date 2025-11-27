// OpenFoodFacts API integration for barcode lookup
// Free, open database with nutrition information

interface NutritionData {
  productName: string;
  servingSize: number | null; // in grams
  carbsPer100g: number | null;
  carbsPerServing: number | null;
  imageUrl?: string;
}

export async function lookupBarcode(barcode: string): Promise<NutritionData | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return null;
    }

    const product = data.product;

    // Extract nutrition data
    const productName = product.product_name || product.product_name_en || "Unknown Product";
    const carbsPer100g = product.nutriments?.carbohydrates_100g ||
                         product.nutriments?.carbohydrates || null;

    // Try to get serving size
    let servingSize: number | null = null;
    let carbsPerServing: number | null = null;

    if (product.serving_size) {
      // Parse serving size (e.g., "30g", "1 cup (240ml)")
      const match = product.serving_size.match(/(\d+\.?\d*)\s*g/);
      if (match) {
        servingSize = parseFloat(match[1]);
      }
    }

    // Calculate carbs per serving if we have both values
    if (servingSize && carbsPer100g) {
      carbsPerServing = (carbsPer100g / 100) * servingSize;
    } else if (product.nutriments?.carbohydrates_serving) {
      carbsPerServing = product.nutriments.carbohydrates_serving;
    }

    // Get product image
    const imageUrl = product.image_front_url ||
                     product.image_front_small_url ||
                     product.image_url;

    return {
      productName,
      servingSize,
      carbsPer100g,
      carbsPerServing,
      imageUrl,
    };
  } catch (error) {
    console.error("Barcode lookup error:", error);
    return null;
  }
}

export function formatNutritionData(data: NutritionData): string {
  let result = `Product: ${data.productName}\n`;

  if (data.servingSize && data.carbsPerServing) {
    result += `Serving: ${data.servingSize}g contains ${data.carbsPerServing.toFixed(1)}g carbs\n`;
  } else if (data.carbsPer100g) {
    result += `Per 100g: ${data.carbsPer100g.toFixed(1)}g carbs\n`;
  }

  return result;
}
