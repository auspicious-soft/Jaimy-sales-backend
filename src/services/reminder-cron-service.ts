import cron, { ScheduledTask } from "node-cron";
import { contactsModel } from "src/models/contacts-schema";
import { messageTemplateModel } from "src/models/message-templates-schema";
import { messagesModel } from "src/models/messages-schema";
import axios from "axios";
import { config } from "src/config/whatsapp";

interface ReminderMetadata {
  type: "reminder";
  templateId: string;
  templateTitle: string;
  remainderHours: number;
  sentAt: Date;
  contactId: string;
}

/**
 * Calculate if a contact should receive a reminder
 * @param lastMessageSentAt - When the last message was sent
 * @param lastMessageReceivedAt - When the last message was received
 * @param remainderHours - Reminder interval in hours
 * @returns boolean - True if reminder should be sent
 */
const shouldSendReminder = (
  lastMessageSentAt: Date | null | undefined,
  lastMessageReceivedAt: Date | null | undefined,
  remainderHours: number
): boolean => {
  // If no lastMessageSentAt, cannot determine
  if (!lastMessageSentAt) return false;

  // lastMessageSentAt should be more recent than lastMessageReceivedAt
  if (lastMessageReceivedAt && lastMessageSentAt <= lastMessageReceivedAt) {
    return false;
  }

  // Calculate time difference in hours
  const now = new Date();
  const timeDifferenceMs = now.getTime() - lastMessageSentAt.getTime();
  const timeDifferenceHours = timeDifferenceMs / (1000 * 60 * 60);

  // Check if within reminder window: remainderHours ± 6 hours
  const lowerBound = remainderHours - 6;
  const upperBound = remainderHours + 6;

  return timeDifferenceHours >= lowerBound && timeDifferenceHours <= upperBound;
};

/**
 * Send WhatsApp message via the configured API
 */
const sendWhatsAppMessage = async (
  phoneNumber: string,
  message: string
): Promise<boolean> => {
  try {
    const response = await axios.post(
      `${config.whatsapp.apiUrl}/${config.whatsapp.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneNumber,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${config.whatsapp.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.status === 200;
  } catch (error) {
    console.error(`Failed to send WhatsApp message to ${phoneNumber}:`, error);
    return false;
  }
};

/**
 * Send reminder messages to eligible contacts
 */
const sendReminderMessages = async (): Promise<void> => {
  try {
    console.log("🔔 Starting reminder cron job...");

    // Fetch all reminder templates
    const reminders = await messageTemplateModel.find({
      templateType: "Remainder",
    });

    if (reminders.length === 0) {
      console.log("⚠️ No reminder templates found");
      return;
    }

    console.log(`📋 Found ${reminders.length} reminder template(s)`);

    // Process each reminder template
    for (const template of reminders) {
      const remainderHours = parseInt(template.remainderHours as string) || 0;

      if (remainderHours === 0) {
        console.log(`⏭️ Skipping template "${template.title}" (remainderHours = 0)`);
        continue;
      }

      console.log(
        `📧 Processing template: "${template.title}" (Reminder window: ${remainderHours} hours)`
      );

      // Fetch all contacts
      const contacts = await contactsModel.find();

      let remindersCount = 0;

      // Check each contact
      for (const contact of contacts) {
        const shouldSend = shouldSendReminder(
          contact.lastMessageSentAt,
          contact.lastMessageReceivedAt,
          remainderHours
        );

        if (shouldSend) {
          console.log(
            `✉️ Sending reminder to ${contact.phoneNumber} for template "${template.title}"`
          );

          // Send the message
          const messageSuccess = await sendWhatsAppMessage(
            contact.phoneNumber,
            template.content
          );

          if (messageSuccess) {
            // Create reminder metadata
            const reminderMetadata: ReminderMetadata = {
              type: "reminder",
              templateId: template._id.toString(),
              templateTitle: template.title,
              remainderHours,
              sentAt: new Date(),
              contactId: contact._id.toString(),
            };

            // Save message in messagesSchema with metadata
            const newMessage = new messagesModel({
              conversationId: `reminder-${contact._id}-${template._id}`,
              contactId: contact._id,
              from: config.whatsapp.phoneNumberId,
              to: contact.phoneNumber,
              body: template.content,
              direction: "outbound",
              status: "sent",
              metadata: reminderMetadata,
            });

            await newMessage.save();
            console.log(
              `✅ Reminder saved for contact ${contact.phoneNumber}`
            );
            remindersCount++;
          } else {
            console.log(
              `❌ Failed to send reminder to ${contact.phoneNumber}`
            );
          }
        }
      }

      console.log(
        `📊 Sent ${remindersCount} reminders for template "${template.title}"`
      );
    }

    console.log("✅ Reminder cron job completed");
  } catch (error) {
    console.error("❌ Error in reminder cron job:", error);
  }
};

/**
 * Initialize and start the reminder cron job
 * Runs every night at 12:00 AM (midnight)
 * Cron format: "0 0 * * *" (minute hour day month dayOfWeek)
 */
export const startReminderCronJob = (): ScheduledTask => {
  // Schedule to run at 12:00 AM every night
  const task = cron.schedule("0 0 * * *", async () => {
    console.log("\n🌙 Midnight reminder cron job triggered at:", new Date());
    await sendReminderMessages();
  });

  // Optionally log when the job is scheduled
  console.log("🕐 Reminder cron job scheduled to run at 12:00 AM every night");

  return task;
};

/**
 * Stop the reminder cron job
 */
export const stopReminderCronJob = (task: ScheduledTask): void => {
  task.stop();
  console.log("🛑 Reminder cron job stopped");
};
