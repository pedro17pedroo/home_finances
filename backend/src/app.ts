import express from "express";
import { config } from "./core/config/index.js";
import { logger } from "./core/utils/logger.js";
import { errorHandler } from "./api/middlewares/error-handler.js";
import apiRoutes from "./api/routes/index.js";

const app = express();

// Trust proxy for correct IP detection
app.set("trust proxy", true);

// CORS configuration (manual implementation)
app.use((req, res, next) => {
  const allowedOrigins = config.ALLOWED_ORIGINS.split(",");
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  next();
});

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files middleware for uploads
app.use("/uploads", express.static("uploads"));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("Request completed", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
  });
  
  next();
});

// API routes
app.use("/api", apiRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;