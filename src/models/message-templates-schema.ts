import mongoose from "mongoose";
import { customAlphabet } from "nanoid";

const messageTemplateSchema = new mongoose.Schema({
	identifier: {
		type: String,
		required: true,
		unique: true,
		default: () => customAlphabet("0123456789", 5)(),
	},
  title: { type: String, required: true },
	templateType: { type: String, required: true, enum: ["Remainder", "Welcome"], default: "Remainder" },
  usedFor: { type: String, required: true, enum: ["Email", "SMS", "Whatsapp","All", "Email/SMS"], default: "contact" },
	content: { type: String, required: true },
	remainderHours: { type: String, default: 0 },
},
{ timestamps: true }
);

export const messageTemplateModel = mongoose.model("messageTemplates", messageTemplateSchema);
