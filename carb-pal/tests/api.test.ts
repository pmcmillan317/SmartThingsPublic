import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock DB connection
vi.mock('../server/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }])
      })
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
      })
    })
  }
}));

// Mock process.env
process.env.DATABASE_URL = "postgres://mock:5432/mock";
process.env.SESSION_SECRET = "mock-secret";

import { registerRoutes } from '../server/routes';

// Mock dependencies
vi.mock('../server/storage', () => ({
  storage: {
    getAllFoods: vi.fn().mockResolvedValue([
      { id: '1', name: 'Apple', carbRatio: 0.1, category: 'Fruits' }
    ]),
    getFoodById: vi.fn().mockImplementation((id) => {
      if (id === '1') return Promise.resolve({ id: '1', name: 'Apple', carbRatio: 0.1, category: 'Fruits' });
      return Promise.resolve(undefined);
    }),
    createMealLog: vi.fn().mockResolvedValue({ id: 1, foodId: '1', weight: 100, carbs: 10, mealType: 'Snack' }),
    getRecentMealLogs: vi.fn().mockResolvedValue([]),
    getMealLogsByDate: vi.fn().mockResolvedValue([]),
    deleteMealLog: vi.fn().mockResolvedValue(true),
    getDailySummary: vi.fn().mockResolvedValue({ totalCarbs: 0 }),
  }
}));

vi.mock('../server/api/usda', () => ({
  searchUSDAFoods: vi.fn().mockResolvedValue({ foods: [] }),
  extractCarbRatio: vi.fn().mockReturnValue(0.1),
}));

vi.mock('../server/api/fatsecret', () => ({
  searchFatSecretFoods: vi.fn().mockResolvedValue({ foods: { food: [] } }),
  extractCarbsFromDescription: vi.fn().mockReturnValue({ carbRatio: 0.1 }),
  searchBrands: vi.fn().mockResolvedValue([]),
  getFoodById: vi.fn(),
}));

// Mock Stripe to avoid connection issues
vi.mock('../server/stripe', () => ({
  stripe: {},
  createCheckoutSession: vi.fn(),
  createCustomerPortalSession: vi.fn(),
  STRIPE_PRICE_IDS: { monthly: 'price_1', yearly: 'price_2' },
}));

// Mock session/auth route requirement for stripe
vi.mock('../server/auth', () => ({
  registerAuthRoutes: vi.fn(),
}));

describe('API Routes', () => {
  let app: express.Express;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    // Mock session middleware
    app.use((req, res, next) => {
      (req as any).session = { userId: 1 };
      next();
    });

    await registerRoutes(app);
  });

  describe('GET /api/foods', () => {
    it('should return a list of foods', async () => {
      const response = await request(app).get('/api/foods');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Apple');
    });
  });

  describe('GET /api/foods/:id', () => {
    it('should return a specific food', async () => {
      const response = await request(app).get('/api/foods/1');
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Apple');
    });

    it('should return 404 for non-existent food', async () => {
      const response = await request(app).get('/api/foods/999');
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/meals', () => {
    it('should create a meal log', async () => {
      const mealData = {
        foodId: '1',
        foodName: 'Apple',
        category: 'Fruits',
        weight: 100,
        carbsCalculated: 10,
        mealType: 'Snack'
      };

      const response = await request(app)
        .post('/api/meals')
        .send(mealData);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
    });

    it('should validate meal data', async () => {
      const invalidData = {
        foodId: '1',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/meals')
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });
});
