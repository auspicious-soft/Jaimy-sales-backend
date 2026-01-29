import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
	{
		hubspotId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "HubSpotContact",
		},
    email: { type: String, required: true, unique: true },
		phoneNumber: { type: String, required: true, unique: true },
		name: String,
		lastMessageReceivedAt: Date,
		lastMessageAt: Date,
		lastMessageSentAt: Date,
		status: { type: String, enum: ["active", "inactive", "blocked"], default: "active" },
		unreadCount: { type: Number, default: 0 },
		region: {
			type: String,
			trim: true,
		},
	},
	{ timestamps: true },
);

export const contactsModel = mongoose.model("contacts", contactSchema);
