// src/middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { HTTP_STATUS } from "../constants/httpStatus.js";

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-passwordHash");
    if (!req.user) return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: "Unauthorized" });
    next();
  } catch (error) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: "Unauthorized" });
  }
};

export const roleMiddleware = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(HTTP_STATUS.FORBIDDEN).json({ message: "Forbidden" });
  next();
};
