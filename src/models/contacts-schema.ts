import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  hubspotId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "hubspotContacts"
  },
  phoneNumber: { type: String, required: true, unique: true },
  name: String,
  lastMessageReceivedAt: Date,
  lastMessageAt: Date,
  lastMessageSentAt: Date,
  status: { type: String, enum: ["active", "inactive", "blocked"], default: "inactive" },
  unreadCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const contactsModel = mongoose.model("contacts", contactSchema);