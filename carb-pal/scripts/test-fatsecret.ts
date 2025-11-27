// Quick test script for FatSecret API
const FATSECRET_CLIENT_ID = process.env.FATSECRET_CONSUMER_KEY;
const FATSECRET_CLIENT_SECRET = process.env.FATSECRET_CONSUMER_SECRET;
const FATSECRET_TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const FATSECRET_API_URL = "https://platform.fatsecret.com/rest/server.api";

async function test() {
  // Get token
  const auth = Buffer.from(`${FATSECRET_CLIENT_ID}:${FATSECRET_CLIENT_SECRET}`).toString('base64');

  const tokenResponse = await fetch(FATSECRET_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=basic',
  });

  if (!tokenResponse.ok) {
    console.error("Token error:", await tokenResponse.text());
    return;
  }

  const { access_token } = await tokenResponse.json();
  console.log("✓ Got access token");

  // Search for foods
  const searchParams = new URLSearchParams({
    method: 'foods.search',
    search_expression: 'mcdonalds',
    max_results: '5',
    format: 'json',
  });

  const searchResponse = await fetch(FATSECRET_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: searchParams.toString(),
  });

  if (!searchResponse.ok) {
    console.error("Search error:", await searchResponse.text());
    return;
  }

  const searchData = await searchResponse.json();
  console.log("\n=== FatSecret API Response ===");
  console.log(JSON.stringify(searchData, null, 2));

  if (searchData.foods && searchData.foods.food) {
    const foods = Array.isArray(searchData.foods.food) ? searchData.foods.food : [searchData.foods.food];
    console.log(`\n✓ Found ${foods.length} foods`);
    foods.forEach((food, idx) => {
      console.log(`\n${idx + 1}. ${food.food_name}`);
      console.log(`   Brand: ${food.brand_name || 'N/A'}`);
      console.log(`   Type: ${food.food_type || 'N/A'}`);
      console.log(`   Desc: ${food.food_description?.substring(0, 100)}...`);
    });
  } else {
    console.log("\n✗ No foods found in response");
  }
}

test().catch(console.error);
