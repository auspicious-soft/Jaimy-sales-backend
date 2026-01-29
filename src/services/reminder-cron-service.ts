import cron, { ScheduledTask } from "node-cron";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import { contactsModel } from "src/models/contacts-schema";
import { messageTemplateModel } from "src/models/message-templates-schema";
import { messagesModel } from "src/models/messages-schema";
import { hubspotContactModel } from "src/models/hubspot-contact-schema";

import { config } from "src/config/whatsapp";
import { htmlToText, renderTemplate } from "src/utils";

/* ---------------------------------------------------
   Utils
--------------------------------------------------- */

const HOURS_24 = 24 * 60 * 60 * 1000;

const is24hWindowOpen = (lastMessageReceivedAt?: Date | null): boolean => {
  if (!lastMessageReceivedAt) return false;
  return Date.now() - lastMessageReceivedAt.getTime() < HOURS_24;
};

const shouldSendReminder = (
  lastMessageSentAt: Date | null | undefined,
  lastMessageReceivedAt: Date | null | undefined,
  remainderHours: number
): boolean => {
  if (!lastMessageSentAt) return false;
  if (lastMessageReceivedAt && lastMessageSentAt <= lastMessageReceivedAt)
    return false;

  const diffHours =
    (Date.now() - lastMessageSentAt.getTime()) / (1000 * 60 * 60);

  return diffHours >= remainderHours - 1 && diffHours <= remainderHours + 1;
};

/* ---------------------------------------------------
   WhatsApp Senders
--------------------------------------------------- */

const sendWhatsAppMessage = async (
  phoneNumber: string,
  message: string
): Promise<boolean> => {
  try {
    const res = await axios.post(
      `${config.whatsapp.apiUrl}/${config.whatsapp.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: { body: message, preview_url: false },
      },
      {
        headers: {
          Authorization: `Bearer ${config.whatsapp.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status === 200;
  } catch (err) {
    console.error(`❌ Text send failed: ${phoneNumber}`, err);
    return false;
  }
};

const sendTemplateMessage = async (
  phoneNumber: string,
  templateName: string,
  fullName: string
): Promise<boolean> => {
  try {
    const res = await axios.post(
      `${config.whatsapp.apiUrl}/${config.whatsapp.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: fullName }],
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${config.whatsapp.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status === 200;
  } catch (err) {
    console.error(`❌ Template send failed: ${phoneNumber}`, err);
    return false;
  }
};

/* ---------------------------------------------------
   Core Reminder Logic
--------------------------------------------------- */

const sendReminderMessages = async (): Promise<void> => {
  try {
    console.log("🔔 Reminder cron started");

    const reminders = await messageTemplateModel.find({
      templateType: "Reminder",
    });

    if (!reminders.length) return;

    const contacts = await contactsModel.find();

    for (const template of reminders) {
      const remainderHours = Number(template.remainderHours);
      if (!remainderHours) continue;

      for (const contact of contacts) {
        const hubspotContact = await hubspotContactModel.findOne({
          phone: contact.phoneNumber,
        });

        if (!hubspotContact) continue;

        // Prevent duplicate reminder
        const alreadySent = hubspotContact.metadata?.some(
          (m: any) => m.templateId === template._id.toString()
        );

        if (alreadySent) continue;

        const sendReminder = shouldSendReminder(
          contact.lastMessageSentAt,
          contact.lastMessageReceivedAt,
          remainderHours
        );

        if (!sendReminder) continue;

        const windowOpen = is24hWindowOpen(
          contact.lastMessageReceivedAt
        );

        // 🔐 Window closed → send template first
        if (!windowOpen) {
          console.log(
            `🪟 Window closed → sending template to ${contact.phoneNumber}`
          );

          const templateOk = await sendTemplateMessage(
            contact.phoneNumber,
            "welcome_template",
            contact.name || "there"
          );

          if (!templateOk) continue;

          await new Promise((r) => setTimeout(r, 1000));
        }

        // Send reminder message
        const rendered = renderTemplate(template.content, {
          first_name: contact.name || "there",
        });

        const finalMessage = htmlToText(rendered);

        const sent = await sendWhatsAppMessage(
          contact.phoneNumber,
          finalMessage
        );

        if (!sent) continue;

        // Save message
        await messagesModel.create({
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
          },
        });

        // Track sent reminder
        await hubspotContactModel.findOneAndUpdate(
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
          }
        );

        console.log(`✅ Reminder sent to ${contact.phoneNumber}`);
      }
    }

    console.log("✅ Reminder cron finished");
  } catch (err) {
    console.error("❌ Reminder cron error", err);
  }
};

/* ---------------------------------------------------
   Cron Start / Stop
--------------------------------------------------- */

export const startReminderCronJob = (): ScheduledTask => {
  const task = cron.schedule(
    "57 13 * * *",
    async () => {
      console.log("🌙 Reminder cron triggered");
      await sendReminderMessages();
    },
    { timezone: "Asia/Kolkata" }
  );

  console.log("🕐 Reminder cron scheduled");
  return task;
};

export const stopReminderCronJob = (task: ScheduledTask): void => {
  task.stop();
  console.log("🛑 Reminder cron stopped");
};
