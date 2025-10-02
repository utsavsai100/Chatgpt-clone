// models/Message.ts
import mongoose, { Schema, model, models } from "mongoose";

const MessageSchema = new Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  text: { type: String },
  parts: { type: Array, default: [] }, // for images or text+image
  createdAt: { type: Date, default: Date.now },
});

export const Message = models.Message || model("Message", MessageSchema);
