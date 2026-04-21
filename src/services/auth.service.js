// src/services/auth.service.js
import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;

export const registerUser = async ({ name, email, password }) => {
  const normEmail = String(email || "").trim().toLowerCase();
  if (!normEmail) throw new Error("Email is required");

  const existingUser = await User.findOne({ email: normEmail });
  if (existingUser) throw new Error("User already exists");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = new User({ name, email: normEmail, passwordHash });
  await user.save();

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

  return { user, token };
};

export const loginUser = async ({ email, password }) => {
  const normEmail = String(email || "").trim().toLowerCase();

  let user = await User.findOne({ email: normEmail });
  if (!user && normEmail) {
    user = await User.findOne({ email: { $regex: new RegExp(`^${normEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } });
  }
  if (!user) throw new Error("Invalid email or password");

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) throw new Error("Invalid email or password");

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

  return { user, token };
};
