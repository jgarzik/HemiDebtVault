/**
 * Express Server Entry Point
 * 
 * This module serves as the main application server for the DeFi debt vault platform,
 * coordinating both API endpoints and frontend asset delivery in a unified process.
 * 
 * Key Features:
 * - Unified server architecture serving both API and frontend assets
 * - Development/production environment handling with Vite integration
 * - Comprehensive request logging and error handling middleware
 * - Performance monitoring with request timing and response capture
 * - Single-port deployment optimized for Replit hosting constraints
 * 
 * Architecture:
 * - Uses Express.js for HTTP server foundation
 * - Integrates Vite dev server in development for hot reloading
 * - Serves static assets in production builds
 * - Implements centralized error handling with proper status codes
 * - Captures and logs API responses for debugging and monitoring
 * 
 * Theory of Operation:
 * The server follows a layered architecture where middleware processes requests
 * in sequence: logging setup → JSON parsing → route handling → error handling.
 * In development, Vite middleware is registered last to catch unhandled routes
 * and serve frontend assets with hot module replacement. Production mode
 * serves pre-built static assets directly.
 */
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
