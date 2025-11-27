import type { Express } from "express";
import { createServer, type Server } from "http";
import { foodRouter } from "./routes/foods";
import { mealRouter } from "./routes/meals";
import { suggestionRouter } from "./routes/suggestions";
import { stripeRouter } from "./routes/stripe";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register modular routes
  app.use(foodRouter);
  app.use(mealRouter);
  app.use(suggestionRouter);
  app.use(stripeRouter);

  const httpServer = createServer(app);
  return httpServer;
}
