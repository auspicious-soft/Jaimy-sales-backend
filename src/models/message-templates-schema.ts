import mongoose from "mongoose";
import { customAlphabet } from "nanoid";

const messageTemplateSchema = new mongoose.Schema(
	{
		identifier: {
			type: String,
			required: true,
			unique: true,
			default: () => customAlphabet("0123456789", 5)(),
		},
		title: { type: String, required: true },
		templateType: { type: String, required: true, enum: ["Reminder", "Welcome"], default: "Reminder" },
		usedFor: { type: String, required: true, enum: ["Email", "SMS", "Whatsapp", "All", "Email/SMS"], default: "Whatsapp" },
		content: { type: String, required: true },
		remainderHours: { type: String, default: 0 },
	},
	{ timestamps: true },
);

export const messageTemplateModel = mongoose.model("messageTemplates", messageTemplateSchema);
