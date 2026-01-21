import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  conversationId: { type: String },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: "contacts" },
  messageId: { type: String, unique: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  body: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  direction: { type: String, enum: ['inbound', 'outbound'], required: true },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  metadata: { type: Object }
});

export const messagesModel = mongoose.model('messages', messageSchema);