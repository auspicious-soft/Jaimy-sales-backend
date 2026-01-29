import { Request, Response } from "express";
import { sendTextMessage, sendTemplateMessage, sendMediaMessage, markAsRead, formatPhoneNumber, isValidPhoneNumber } from "../services/whatsapp-service";
import { contactsModel } from "../models/contacts-schema";
import { messagesModel } from "../models/messages-schema";
import { config } from "src/config/whatsapp";
import { getIO } from "src/lib/socket";
import { hubspotContactModel } from "src/models/hubspot-contact-schema";

/**
 * Send a message
 */
export async function sendMessage(req: Request, res: Response): Promise<void> {
	try {
		const { to, message } = req.body as {
			to?: string;
			message?: string;
		};

		// Validation
		if (!to || !message) {
			res.status(400).json({
				success: false,
				error: "Phone number and message are required",
			});
			return;
		}

		// Format and validate phone number
		const formattedPhone = formatPhoneNumber(to);

		if (!isValidPhoneNumber(formattedPhone)) {
			res.status(400).json({
				success: false,
				error: "Invalid phone number format. Use international format without + (e.g., 919729360795)",
			});
			return;
		}

		console.log("📞 Phone number formatted:", {
			original: to,
			formatted: formattedPhone,
		});

		// Send via WhatsApp API
		const result = await sendTextMessage(formattedPhone, message);

		if (!result.success) {
			res.status(500).json(result);
			return;
		}

		// Save message to database
		const newMessage = await messagesModel.create({
			messageId: result.messageId!,
			from: config.whatsapp.phoneNumberId,
			to: to,
			body: message,
			direction: "outbound",
			status: "sent",
			timestamp: new Date(),
		});

		// Update or create contact
		await contactsModel.findOneAndUpdate(
			{ phoneNumber: formattedPhone },
			{
				lastMessageSentAt: new Date(),
				phoneNumber: formattedPhone,
			},
			{ upsert: true, new: true },
		);

		res.json({
			success: true,
			message: "Message sent successfully",
			data: newMessage,
		});
	} catch (error: any) {
		console.error("❌ Send Message Error:", error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
}

/**
 * Send template message
 */
export async function sendTemplate(req: Request, res: Response): Promise<void> {
	try {
		const { to, templateName, languageCode = "en", components } = req.body;

		if (!to || !templateName) {
			res.status(400).json({
				success: false,
				error: "Phone number and template name are required",
			});
			return;
		}

		const formattedPhone = formatPhoneNumber(to);

		if (!isValidPhoneNumber(formattedPhone)) {
			res.status(400).json({
				success: false,
				error: "Invalid phone number format",
			});
			return;
		}

		const result = await sendTemplateMessage(formattedPhone, templateName, languageCode, components);

		if (!result.success) {
			res.status(500).json(result);
			return;
		}

		// Save to database
		await messagesModel.create({
			messageId: result.messageId!,
			from: config.whatsapp.phoneNumberId,
			to: to,
			body: `Template: ${templateName}`,
			direction: "outbound",
			status: "sent",
			timestamp: new Date(),
			metadata: { templateName, languageCode, components },
		});

		await contactsModel.findOneAndUpdate({ phoneNumber: formattedPhone }, { lastMessageSentAt: new Date(), lastMessageAt: new Date(), phoneNumber: formattedPhone }, { upsert: true, new: true });

		res.json({
			success: true,
			message: "Template sent successfully",
			data: result,
		});
	} catch (error: any) {
		console.error("❌ Send Template Error:", error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
}

/**
 * Send media message
 */
export async function sendMedia(req: Request, res: Response): Promise<void> {
	try {
		const { to, mediaType, mediaUrl, caption } = req.body;

		if (!to || !mediaType || !mediaUrl) {
			res.status(400).json({
				success: false,
				error: "Phone number, media type, and media URL are required",
			});
			return;
		}

		const formattedPhone = formatPhoneNumber(to);

		if (!isValidPhoneNumber(formattedPhone)) {
			res.status(400).json({
				success: false,
				error: "Invalid phone number format",
			});
			return;
		}

		const result = await sendMediaMessage(formattedPhone, mediaType, mediaUrl, caption);

		if (!result.success) {
			res.status(500).json(result);
			return;
		}

		await messagesModel.create({
			messageId: result.messageId!,
			from: config.whatsapp.phoneNumberId,
			to: to,
			body: caption || `Media: ${mediaType}`,
			direction: "outbound",
			status: "sent",
			timestamp: new Date(),
			metadata: { mediaType, mediaUrl, caption },
		});

		await contactsModel.findOneAndUpdate({ phoneNumber: formattedPhone }, { lastMessageSentAt: new Date(), lastMessageAt: new Date(), phoneNumber: formattedPhone }, { upsert: true, new: true });

		res.json({
			success: true,
			message: "Media sent successfully",
			data: result,
		});
	} catch (error: any) {
		console.error("❌ Send Media Error:", error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
}

/**
 * Webhook verification (GET)
 */
export function verifyWebhook(req: Request, res: Response): void {
	const mode = req.query["hub.mode"];
	const token = req.query["hub.verify_token"];
	const challenge = req.query["hub.challenge"];

	console.log("🔍 Webhook verification attempt:", {
		mode,
		token: token ? "***" + String(token).slice(-4) : "none",
		challenge: challenge ? "present" : "none",
	});

	if (mode === "subscribe" && token === config.whatsapp.verifyToken) {
		console.log("✅ Webhook verified successfully");
		res.status(200).send(challenge);
	} else {
		console.log("❌ Webhook verification failed");
		res.sendStatus(403);
	}
}

/**
 * Webhook handler (POST)
 */

// export async function handleWebhook(req: Request, res: Response) {
//   try {
//     const body = req.body;
//     console.log('body: ', body);

//     if (body.object !== 'whatsapp_business_account') {
//       return res.sendStatus(200);
//     }

//     for (const entry of body.entry || []) {

//       const changes = entry.changes?.[0];
//       const value = changes?.value;

//       if (!value) continue;

//       const io = getIO();

//       // ================= INBOUND MESSAGES =================

//       if (value.messages?.length) {

//         for (const message of value.messages) {

//           const messageBody =
//             message.text?.body ||
//             message.image?.caption ||
//             message.video?.caption ||
//             message.document?.caption ||
//             `[${message.type}]`;

//           const savedMsg = await messagesModel.create({
//             messageId: message.id,
//             from: message.from,
//             to: value.metadata.phone_number_id,
//             body: messageBody,
//             direction: 'inbound',
//             timestamp: new Date(Number(message.timestamp) * 1000),
//             metadata: message,
//           });

//           await contactsModel.findOneAndUpdate(
//             { phoneNumber: message.from },
//             {
//               phoneNumber: message.from,
//               lastMessage: messageBody,
//               lastMessageSentAt: new Date(),
//               lastMessageAt: new Date(),
//               $inc: { unreadCount: 1 },
//             },
//             { upsert: true, new: true }
//           );

//           // 🔥 REALTIME EMIT
//           io.to(message.from).emit("newMessage", savedMsg);
//         }
//       }

//       // ================= STATUS UPDATES =================

//       if (value.statuses?.length) {

//         for (const status of value.statuses) {

//           const updated = await messagesModel.findOneAndUpdate(
//             { messageId: status.id },
//             { status: status.status },
//             { new: true }
//           );

//           if (updated) {
//             io.to(status.recipient_id).emit("messageStatus", updated);
//           }
//         }
//       }
//     }

//     res.sendStatus(200);

//   } catch (err) {
//     console.error("Webhook error:", err);
//     res.sendStatus(500);
//   }
// }

export async function handleWebhook(req: Request, res: Response) {
	try {
		const body = req.body;

		console.log("📩 Webhook received:");
		console.dir(body, { depth: null });

		if (body.object !== "whatsapp_business_account") {
			console.log("⚠️ Not WhatsApp webhook, skipping");
			return res.sendStatus(200);
		}

		for (const entry of body.entry || []) {
			console.log("➡ Processing entry");

			const changes = entry.changes?.[0];
			const value = changes?.value;

			if (!value) {
				console.log("⚠️ No value found in entry");
				continue;
			}

			const io = getIO();

			// ============================
			// 📥 INBOUND MESSAGES
			// ============================

			if (value.messages?.length) {
				console.log("📨 Incoming messages:", value.messages.length);

				for (const message of value.messages) {
					console.log("➡ Message payload:", message);

					const messageBody = message.text?.body || message.image?.caption || message.video?.caption || message.document?.caption || `[${message.type}]`;

					console.log("📝 Parsed body:", messageBody);

					// 💾 Save message
					const savedMsg = await messagesModel.create({
						messageId: message.id,
						from: `+${message.from}`,
						to: value.metadata.phone_number_id,
						body: messageBody,
						direction: "inbound",
						timestamp: new Date(Number(message.timestamp) * 1000),
						metadata: message,
					});
					const checkConversationStarted = await hubspotContactModel.findOne({ phone: `+${message.from}` });
					console.log("checkConversationStarted: ", checkConversationStarted?.metadata);
					const hasConversationStartedAt = checkConversationStarted?.metadata?.some((item: any) => "conversationStartedAt" in item);
					
					console.log(hasConversationStartedAt);
					if (!hasConversationStartedAt) {
						await hubspotContactModel.updateOne({ phone: `+${message.from}` }, { $push: { metadata: { conversationStartedAt: new Date() } } });
					}
					console.log("✅ Message saved:", savedMsg._id);
					
					// 📇 Update contact
					const contact = await contactsModel.findOneAndUpdate(
						{ phoneNumber: `+${message.from}` },
						{   
							phoneNumber: `+${message.from}`,
							lastMessage: messageBody,
							lastMessageSentAt: new Date(),
							lastMessageAt: new Date(),
							$inc: { unreadCount: 1 },
						},
						{ upsert: true, new: true },
					);
					
					console.log("👤 Contact updated:", contact?.phoneNumber);
					
					// 🔥 REALTIME EMIT
					
					io.to(`+${message.from}`).emit("newMessage", savedMsg);
					console.log("📤 Emitted event: newMessage");
					console.log("➡ Room:", `+${message.from}`);

					// 🔍 Check listeners
					const room = io.sockets.adapter.rooms.get(`+${message.from}`);

					console.log("👥 Active listeners:", room ? room.size : 0);
				}
			}

			// ============================
			// 📊 STATUS UPDATES
			// ============================

			if (value.statuses?.length) {
				console.log("📊 Status updates:", value.statuses.length);

				for (const status of value.statuses) {
					console.log("➡ Status payload:", status);

					const updated = await messagesModel.findOneAndUpdate({ messageId: status.id }, { status: status.status }, { new: true });

					if (!updated) {
						console.log("⚠️ Message not found for status:", status.id);
						continue;
					}

					console.log("✅ Status updated:", updated.status);

					io.to(`${status.recipient_id}`).emit("messageStatus", updated);
					console.log('status.recipient_id: ', `${status.recipient_id}`);

					console.log("📤 Emitted event: messageStatus");
					console.log("➡ Room:", `${status.recipient_id}`);

					const room = io.sockets.adapter.rooms.get(`${status.recipient_id}`);

					console.log("👥 Active listeners:", room ? room.size : 0);
				}
			}
		}

		console.log("✅ Webhook processed successfully\n");

		res.sendStatus(200);
	} catch (err) {
		console.error("❌ Webhook error:", err);

		res.sendStatus(500);
	}
}

// export async function handleWebhook(req: Request, res: Response): Promise<void> {
//   try {
//     const body = req.body;

//     console.log('📨 Webhook received:', JSON.stringify(body, null, 2));

//     if (body.object !== 'whatsapp_business_account') {
//       console.log('⚠️ Not a WhatsApp business account webhook');
//       res.sendStatus(200);
//       return;
//     }

//     for (const entry of body.entry ?? []) {
//       const changes = entry.changes?.[0];
//       const value = changes?.value;

//       if (!value) continue;

//       // Handle incoming messages
//       if (value.messages && value.messages.length > 0) {
//         for (const message of value.messages) {
//           console.log('📥 Incoming message:', {
//             from: message.from,
//             type: message.type,
//             id: message.id,
//           });

//           const messageBody = message.text?.body ||
//                             message.image?.caption ||
//                             message.video?.caption ||
//                             message.document?.caption ||
//                             `[${message.type}]`;

//           // Save message to database
//           await messagesModel.create({
//             messageId: message.id,
//             from: message.from,
//             to: value.metadata.phone_number_id,
//             body: messageBody,
//             direction: 'inbound',
//             timestamp: new Date(Number(message.timestamp) * 1000),
//             metadata: message,
//           });

//           // Update contact
//           await contactsModel.findOneAndUpdate(
//             { phoneNumber: message.from },
//             {
//               phoneNumber: message.from,
//               lastMessageReceivedAt: new Date(),
//               lastMessageAt: new Date(),
//               $inc: { unreadCount: 1 },
//             },
//             { upsert: true, new: true }
//           );

//           // Mark as read
//           // await markAsRead(message.id);
//         }
//       }

//       // Handle status updates
//       if (value.statuses && value.statuses.length > 0) {
//         for (const status of value.statuses) {
//           console.log('📊 Status update:', {
//             messageId: status.id,
//             status: status.status,
//             recipientId: status.recipient_id,
//             errors: status.errors,
//           });

//           // Update message status
//           const updateData: any = {
//             status: status.status
//           };

//           if (status.errors && status.errors.length > 0) {
//             updateData.error = status.errors[0];
//           }

//           await messagesModel.findOneAndUpdate(
//             { messageId: status.id },
//             updateData
//           );
//         }
//       }
//     }

//     res.sendStatus(200);
//   } catch (error) {
//     console.error('❌ Webhook Error:', error);
//     res.sendStatus(500);
//   }
// }

/**
 * Get messages for a contact or all messages
 */
export async function getMessages(req: Request, res: Response): Promise<void> {
	try {
		const {
			phoneNumber,
			limit = "50",
			page = "1",
		} = req.query as {
			phoneNumber?: string;
			limit?: string;
			page?: string;
		};
		
		console.log('phoneNumber: ', phoneNumber);
		const limitNum = parseInt(limit);
		const pageNum = parseInt(page);
		const skip = (pageNum - 1) * limitNum;

		let query: any = {};

		if (phoneNumber) {
			// const formattedPhone = formatPhoneNumber(phoneNumber);
			query = {
				$or: [{ from: phoneNumber }, { to: phoneNumber }],
			};
		}

		const [messages, total] = await Promise.all([messagesModel.find(query).sort({ timestamp: 1 }).skip(skip).limit(limitNum), messagesModel.countDocuments(query)]);

		res.json({
			success: true,
			data: messages,
			pagination: {
				page: pageNum,
				limit: limitNum,
				total,
				totalPages: Math.ceil(total / limitNum),
			},
		});
	} catch (error: any) {
		console.error("❌ Get Messages Error:", error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
}

/**
 * Get all contacts
 */
export async function getContacts(req: Request, res: Response): Promise<void> {
	try {
		const { search } = req.query; // single search input (name or phone)

		const query: any = {};

		if (search) {
			query.$or = [
				{ name: { $regex: search as string, $options: "i" } }, // search by name
				{ phoneNumber: { $regex: search as string, $options: "i" } }, // search by phone
			];
		}

		const contacts = await contactsModel.find(query).sort({ lastMessageAt: -1 }).populate("hubspotId");

		res.json({
			success: true,
			data: contacts,
		});
	} catch (error: any) {
		console.error("❌ Get Contacts Error:", error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
}

/**
 * Mark contact messages as read
 */
export async function markContactAsRead(req: Request, res: Response): Promise<void> {
	try {
		const { phoneNumber } = req.params;

		if (!phoneNumber) {
			res.status(400).json({
				success: false,
				error: "Phone number is required",
			});
			return;
		}

		const formattedPhone = formatPhoneNumber(phoneNumber);

		await contactsModel.findOneAndUpdate({ phoneNumber: formattedPhone }, { unreadCount: 0 });

		res.json({
			success: true,
			message: "Contact marked as read",
		});
	} catch (error: any) {
		console.error("❌ Mark Contact as Read Error:", error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
}
