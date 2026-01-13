import { Request, Response } from "express";
import {
  sendTextMessage,
  markAsRead,
} from "../services/whatsapp-service";
import { contactsModel } from "src/models/contacts-schema";
import { messagesModel } from "src/models/messages-schema";

/**
 * Send a message
 */
export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const { to, message } = req.body as {
      to?: string;
      message?: string;
    };

    if (!to || !message) {
      res.status(400).json({
        success: false,
        error: "Phone number and message are required",
      });
      return;
    }

    // Send via WhatsApp API
    const result = await sendTextMessage(to, message);

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    // Save message
    const newMessage = await messagesModel.create({
      messageId: result.messageId,
      from: process.env.WHATSAPP_PHONE_NUMBER_ID,
      to,
      body: message,
      direction: "outbound",
      status: "sent",
    });

    // Update or create contact
    await contactsModel.findOneAndUpdate(
      { phoneNumber: to },
      { lastMessageAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error: any) {
    console.error("Send Message Error:", error);
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

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    console.log("Webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
}

/**
 * Webhook handler (POST)
 */
export async function handleWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") {
      res.sendStatus(200);
      return;
    }

    for (const entry of body.entry ?? []) {
      const changes = entry.changes?.[0];
      const value = changes?.value;

      if (!value) continue;

      // Incoming messages
      if (value.messages) {
        const message = value.messages[0];

        await messagesModel.create({
          messageId: message.id,
          from: message.from,
          to: value.metadata.phone_number_id,
          body: message.text?.body ?? "",
          direction: "inbound",
          timestamp: new Date(Number(message.timestamp) * 1000),
          metadata: message,
        });

        await contactsModel.findOneAndUpdate(
          { phoneNumber: message.from },
          {
            lastMessageAt: new Date(),
            $inc: { unreadCount: 1 },
          },
          { upsert: true, new: true }
        );

        await markAsRead(message.id);
      }

      // Status updates
      if (value.statuses) {
        const status = value.statuses[0];

        await messagesModel.findOneAndUpdate(
          { messageId: status.id },
          { status: status.status }
        );
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook Error:", error);
    res.sendStatus(500);
  }
}

/**
 * Get messages
 */
export async function getMessages(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { phoneNumber, limit = "50" } = req.query as {
      phoneNumber?: string;
      limit?: string;
    };

    const query = phoneNumber
      ? { $or: [{ from: phoneNumber }, { to: phoneNumber }] }
      : {};

    const messages = await messagesModel.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get contacts
 */
export async function getContacts(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const contacts = await contactsModel.find().sort({
      lastMessageAt: -1,
    });

    res.json({
      success: true,
      data: contacts,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
