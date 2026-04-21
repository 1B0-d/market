// src/app.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.routes.js"; 
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import likeRoutes from "./routes/like.routes.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";
import { HTTP_STATUS } from "./constants/httpStatus.js";

const app = express();

// для __dirname в ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const corsOrigins = String(process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAllOrigins = corsOrigins.length === 0 || corsOrigins.includes("*");

// middlewares
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowAllOrigins) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    if (origin) res.setHeader("Vary", "Origin");
  } else if (origin && corsOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static frontend
app.use(express.static(path.join(__dirname, "../public")));

// test route
app.get("/api/health", (req, res) => {
  res.status(HTTP_STATUS.OK).json({ status: "OK" });
});




// **auth routes**
app.use("/api/auth", authRoutes);

app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/likes", likeRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
