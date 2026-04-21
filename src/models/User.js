import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },

  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

  cart: {
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        size: String,
        color: String,
        quantity: { type: Number, min: 1, default: 1 }
      }
    ]
  }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
