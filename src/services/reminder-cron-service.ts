// import cron, { ScheduledTask } from "node-cron";
// import axios from "axios";
// import { contactsModel } from "src/models/contacts-schema";
// import { messageTemplateModel } from "src/models/message-templates-schema";
// import { messagesModel } from "src/models/messages-schema";
// import { hubspotContactModel } from "src/models/hubspot-contact-schema";
// import { config } from "src/config/whatsapp";
// import { htmlToText, renderTemplate } from "src/utils";
// import { WhatsAppFailureNotificationEmail } from "src/utils/mails/mail";

// /* -------------------------------------------------------------------------- */
// /*                                   TYPES                                    */
// /* -------------------------------------------------------------------------- */

// interface ReminderMetadata {
//   type: "Reminder";
//   templateId: string;
//   templateTitle: string;
//   remainderHours: number;
//   sentAt: Date;
//   contactId: string;
// }

// /* -------------------------------------------------------------------------- */
// /*                           REMINDER CALCULATION                              */
// /* -------------------------------------------------------------------------- */

// const shouldSendReminder = (
//   lastMessageSentAt?: Date | null,
//   lastMessageReceivedAt?: Date | null,
//   remainderHours?: number
// ): boolean => {
//   if (!lastMessageSentAt || !remainderHours) return false;

//   if (
//     lastMessageReceivedAt &&
//     lastMessageSentAt <= lastMessageReceivedAt
//   ) {
//     return false;
//   }

//   const diffHours =
//     (Date.now() - lastMessageSentAt.getTime()) /
//     (1000 * 60 * 60);

//   return diffHours >= remainderHours - 1 && diffHours <= remainderHours + 1;
// };

// /* -------------------------------------------------------------------------- */
// /*                              SEND WHATSAPP                                 */
// /* -------------------------------------------------------------------------- */

// const sendWhatsAppMessage = async (
//   phoneNumber: string,
//   message: string
// ): Promise<boolean> => {
//   try {
//     const res = await axios.post(
//       `${config.whatsapp.apiUrl}/${config.whatsapp.phoneNumberId}/messages`,
//       {
//         messaging_product: "whatsapp",
//         to: phoneNumber,
//         type: "text",
//         text: { body: message },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${config.whatsapp.accessToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     return res.status === 200;
//   } catch (err) {
//     console.error("❌ WhatsApp send failed:", phoneNumber);
//     return false;
//   }
// };

// /* -------------------------------------------------------------------------- */
// /*                          MAIN REMINDER FUNCTION                             */
// /* -------------------------------------------------------------------------- */

// const sendReminderMessages = async (): Promise<void> => {
//   try {
//     console.log("🔔 Reminder cron started");

//     const reminders = await messageTemplateModel.find({
//       templateType: "Reminder",
//     });

//     if (!reminders.length) {
//       console.log("⚠️ No reminder templates found");
//       return;
//     }

//     // 🔑 MAX remainderHours
//     const maxRemainderHours = Math.max(
//       ...reminders.map(r => parseInt(r.remainderHours as string) || 0)
//     );

//     console.log("⏱️ Max remainder hours:", maxRemainderHours);

//     const contacts = await contactsModel.find();

//     for (const contact of contacts) {
//       /* ------------------------- SEND REMINDERS -------------------------- */
//       for (const template of reminders) {
//         const remainderHours = parseInt(template.remainderHours as string) || 0;

//         if (
//           shouldSendReminder(
//             contact.lastMessageSentAt,
//             contact.lastMessageReceivedAt,
//             remainderHours
//           )
//         ) {
//           const renderedHtml = renderTemplate(template.content, {
//             first_name: contact.name || "there",
//           });

//           const finalMessage = htmlToText(renderedHtml);
//           const sent = await sendWhatsAppMessage(
//             contact.phoneNumber,
//             finalMessage
//           );

//           if (sent) {
//             const metadata: ReminderMetadata = {
//               type: "Reminder",
//               templateId: template._id.toString(),
//               templateTitle: template.title,
//               remainderHours,
//               sentAt: new Date(),
//               contactId: contact._id.toString(),
//             };

//             await messagesModel.create({
//               conversationId: `reminder-${contact._id}-${template._id}`,
//               contactId: contact._id,
//               from: config.whatsapp.phoneNumberId,
//               to: contact.phoneNumber,
//               body: finalMessage,
//               direction: "outbound",
//               status: "sent",
//               metadata,
//             });

//             console.log("✅ Reminder sent:", contact.phoneNumber);
//           }
//         }
//       }

//       /* ---------------------- DEAD LEAD CHECK ----------------------------- */
//       const lastMaxReminder = await messagesModel.findOne({
//         contactId: contact._id,
//         "metadata.type": "Reminder",
//         "metadata.remainderHours": maxRemainderHours,
//       });

//       if (!lastMaxReminder) continue;

//       const hubspotContact = await hubspotContactModel.findOne({
//         phone: contact.phoneNumber,
//       });

//       if (!hubspotContact) continue;

//       const alreadyDeadLead =
//         Array.isArray(hubspotContact.metadata) &&
//         hubspotContact.metadata.some(
//           (m: any) => m.deadLead === true
//         );

//       if (alreadyDeadLead) {
//         console.log("⏭️ Dead lead already marked:", contact.phoneNumber);
//         continue;
//       }

//       // 📧 SEND DEAD LEAD EMAIL
//       await WhatsAppFailureNotificationEmail(
//         hubspotContact.email,
//         contact.phoneNumber,
//         contact.name || "there"
//       );

//       // ☠️ MARK DEAD LEAD
//       await hubspotContactModel.findByIdAndUpdate(
//         hubspotContact._id,
//         {
//           $push: {
//             metadata: {
//               deadLead: true,
//               markedAt: new Date(),
//               reason: "max_reminder_sent",
//             },
//           },
//         }
//       );

//       console.log("☠️ Marked dead lead:", contact.phoneNumber);
//     }

//     console.log("✅ Reminder cron completed");
//   } catch (err) {
//     console.error("❌ Reminder cron failed:", err);
//   }
// };

// /* -------------------------------------------------------------------------- */
// /*                              CRON SCHEDULER                                 */
// /* -------------------------------------------------------------------------- */

// export const startReminderCronJob = (): ScheduledTask => {
//   const task = cron.schedule(
//     "41 16 * * *",
//     async () => {
//       console.log("⏰ Reminder cron triggered");
//       await sendReminderMessages();
//     },
//     { timezone: "Asia/Kolkata" }
//   );

//   console.log("🕐 Reminder cron scheduled");
//   return task;
// };

// export const stopReminderCronJob = (task: ScheduledTask): void => {
//   task.stop();
//   console.log("🛑 Reminder cron stopped");
// };

import cron, { ScheduledTask } from "node-cron";
import { contactsModel } from "src/models/contacts-schema";
import { messageTemplateModel } from "src/models/message-templates-schema";
import { messagesModel } from "src/models/messages-schema";
import { hubspotContactModel } from "src/models/hubspot-contact-schema";
import axios from "axios";
import { config } from "src/config/whatsapp";
import { htmlToText, renderTemplate } from "src/utils";
import { WhatsAppFailureNotificationEmail } from "src/utils/mails/mail";
import { v4 as uuidv4 } from "uuid";

interface ReminderMetadata {
	type: "Reminder" | "Welcome";
	templateId: string;
	templateTitle: string;
	remainderHours: number;
	sentAt: Date;
	contactId: string;
}

/**
 * Calculate if a contact should receive a reminder
 */
const shouldSendReminder = (lastMessageSentAt: Date | null | undefined, lastMessageReceivedAt: Date | null | undefined, remainderHours: number): boolean => {
	if (!lastMessageSentAt) return false;
	if (lastMessageReceivedAt && lastMessageSentAt <= lastMessageReceivedAt) return false;

	const now = new Date();
	const diffHours = (now.getTime() - lastMessageSentAt.getTime()) / (1000 * 60 * 60);

	const lowerBound = remainderHours - 1;
	const upperBound = remainderHours + 1;

	return diffHours >= lowerBound && diffHours <= upperBound;
};

/**
 * Send WhatsApp message
 */
const sendWhatsAppMessage = async (phoneNumber: string, message: string): Promise<boolean> => {
	try {
		const response = await axios.post(
			`${config.whatsapp.apiUrl}/${config.whatsapp.phoneNumberId}/messages`,
			{
				messaging_product: "whatsapp",
				recipient_type: "individual",
				to: phoneNumber,
				type: "text",
				text: { preview_url: false, body: message },
			},
			{
				headers: {
					Authorization: `Bearer ${config.whatsapp.accessToken}`,
					"Content-Type": "application/json",
				},
			},
		);
		return response.status === 200;
	} catch (error) {
		console.error(`❌ Failed WhatsApp for ${phoneNumber}:`, error);
		return false;
	}
};

/**
 * Send reminders and handle dead leads
 */
const sendReminderMessages = async (): Promise<void> => {
	try {
		console.log("🔔 Starting reminder cron job...");

		const reminders = await messageTemplateModel.find({ templateType: "Reminder" });
		console.log("reminders: ", reminders);
		if (reminders.length === 0) {
			console.log("⚠️ No reminder templates found");
			return;
		}

		const contacts = await contactsModel.find();
		console.log("contacts: ", contacts);

		for (const template of reminders) {
			const remainderHours = parseInt(template.remainderHours as string) || 0;
			console.log("remainderHours: ", remainderHours);
			if (remainderHours === 0) continue;

			console.log(`📧 Processing template: "${template.title}"`);

			for (const contact of contacts) {
				// Fetch HubSpot contact metadata
				const hubspotContact = await hubspotContactModel.findOne({ phone: contact.phoneNumber });
				console.log("hubspotContact: ", hubspotContact);
				if (!hubspotContact) continue;

				// 			const latestMetadata = hubspotContact.metadata?.slice(-1)[0] || {};
				// 			console.log("latestMetadata: ", latestMetadata);
				// 			const sentTemplates: string[] = Array.isArray(latestMetadata)
				// ? latestMetadata
				// : [];

				// 			// Check if this template was already sent
				//       console.log('template._id: ', template._id);
				// 			if (sentTemplates.find((t: any) => t.templateId === template._id.toString())) {
				// 				console.log(`⏭️ Template already sent to ${contact.phoneNumber}`);
				// 				continue;
				// 			}
				const metadataArray = hubspotContact.metadata || [];

				const templateIdStr = template._id.toString();
				console.log("templateIdStr: ", templateIdStr);

				const templateAlreadySent = metadataArray.some((entry: any) => entry.templateId === templateIdStr);
				console.log("templateAlreadySent: ", templateAlreadySent);

				if (templateAlreadySent) {
					console.log(`⏭️ Template already sent to ${contact.phoneNumber}`);
					continue;
				}
				// Check if reminder should be sent
				const shouldSend = shouldSendReminder(contact.lastMessageSentAt, contact.lastMessageReceivedAt, remainderHours);
				console.log("shouldSend: ", shouldSend);

				if (shouldSend) {
					// Render template & send message
					const renderedHtml = renderTemplate(template.content, { first_name: contact.name || "there" });
					const finalMessage = htmlToText(renderedHtml);
					const messageSuccess = await sendWhatsAppMessage(contact.phoneNumber, finalMessage);
					console.log("messageSuccess: ", messageSuccess);

					if (messageSuccess) {
						// Save WhatsApp message
						const newMessage = new messagesModel({
							conversationId: `reminder-${contact._id}-${template._id}`,
							messageId: uuidv4(),
							contactId: contact._id,
							from: config.whatsapp.phoneNumberId,
							to: contact.phoneNumber,
							body: finalMessage,
							direction: "outbound",
							status: "sent",
							metadata: {
								type: "Reminder",
								templateId: template._id.toString(),
								templateTitle: template.title,
								remainderHours,
								sentAt: new Date(),
								contactId: contact._id.toString(),
							},
						});
						await newMessage.save();
						// Update HubSpot metadata to track sent template
						const updatedHubspotContact = await hubspotContactModel.findOneAndUpdate(
							{ phone: contact.phoneNumber },
							{
								$push: {
									metadata: {
										templateId: template._id.toString(),
										templateTitle: template.title,
										remainderHours,
										sentAt: new Date(),
									},
								},
							},
						);
						console.log("contact._id: ", contact._id);

						console.log("updatedHubspotContact: ", updatedHubspotContact);
						console.log(`✅ Reminder sent to ${contact.phoneNumber}`);
					} else {
						console.log(`❌ Failed to send reminder to ${contact.phoneNumber}`);
					}
				}

				// Handle Dead Lead: if last message sent > max remainderHours
				const maxRemainder = Math.max(...reminders.map((r) => parseInt(r.remainderHours as string) || 0));
				const lastMessageTime = contact.lastMessageSentAt || new Date(0);
				const hoursSinceLastMessage = (new Date().getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);

				if (hoursSinceLastMessage > maxRemainder && !hubspotContact.metadata?.deadLead) {
					// Send Dead Lead email
					await WhatsAppFailureNotificationEmail(hubspotContact.email, contact.phoneNumber, contact.name);

					// Update metadata to mark dead lead
					await hubspotContactModel.findOneAndUpdate(
						{ phone: contact.phoneNumber },
						{
							$set: { "metadata.deadLead": true },
						},
					);

					console.log(`📧 Dead Lead email sent to ${hubspotContact.email}`);
				}
			}
		}

		console.log("✅ Reminder cron job completed");
	} catch (error) {
		console.error("❌ Error in reminder cron job:", error);
	}
};

/**
 * Start cron job at 12:00 AM IST daily
 */
export const startReminderCronJob = (): ScheduledTask => {
	const task = cron.schedule(
		"08 18 * * *",
		async () => {
			console.log("\n🌙 Reminder cron triggered at:", new Date());
			await sendReminderMessages();
		},
		{ timezone: "Asia/Kolkata" },
	);
	console.log("🕐 Reminder cron job scheduled");
	return task;
};

/**
 * Stop cron job
 */
export const stopReminderCronJob = (task: ScheduledTask): void => {
	task.stop();
	console.log("🛑 Reminder cron job stopped");
};
