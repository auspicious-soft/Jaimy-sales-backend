import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  name: String,
  lastMessageAt: Date,
  unreadCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const contactsModel = mongoose.model("contacts", contactSchema);