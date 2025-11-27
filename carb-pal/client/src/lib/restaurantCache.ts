// Restaurant menu caching with daily refresh
import { Brand } from '../types/restaurant';

interface CachedBrand {
  brand: Brand;
  cachedAt: number; // timestamp
}

const CACHE_KEY_PREFIX = 'restaurant_menu_';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Get cached restaurant menu if available and not expired
export function getCachedRestaurantMenu(brandName: string): Brand | null {
  try {
    const cacheKey = CACHE_KEY_PREFIX + brandName.toLowerCase().replace(/\s+/g, '_');
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const { brand, cachedAt }: CachedBrand = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired (older than 24 hours)
    if (now - cachedAt > CACHE_DURATION_MS) {
      // Cache expired, remove it
      localStorage.removeItem(cacheKey);
      return null;
    }

    return brand;
  } catch (error) {
    console.error('Error reading restaurant cache:', error);
    return null;
  }
}

// Cache restaurant menu with current timestamp
export function cacheRestaurantMenu(brand: Brand): void {
  try {
    const cacheKey = CACHE_KEY_PREFIX + brand.brand_name.toLowerCase().replace(/\s+/g, '_');
    const cached: CachedBrand = {
      brand,
      cachedAt: Date.now(),
    };

    localStorage.setItem(cacheKey, JSON.stringify(cached));
  } catch (error) {
    console.error('Error caching restaurant menu:', error);
  }
}

// Clear all restaurant caches
export function clearAllRestaurantCaches(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing restaurant caches:', error);
  }
}

// Clear expired caches (run on app load)
export function clearExpiredCaches(): void {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();

    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const { cachedAt }: CachedBrand = JSON.parse(cached);
            if (now - cachedAt > CACHE_DURATION_MS) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // If there's an error parsing, just remove the cache
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error('Error clearing expired caches:', error);
  }
}
