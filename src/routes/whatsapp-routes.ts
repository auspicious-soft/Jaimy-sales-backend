import { Router } from "express";

import {
    sendMessage,
    verifyWebhook,
    handleWebhook,
    getMessages,
    getContacts,
} from "../controllers/whatsapp-controller";

const router = Router();

/**
 * Send WhatsApp message
 */
router.post("/send", sendMessage);

/**
 * Webhook verification (Meta)
 */
router.get("/webhook", verifyWebhook);

/**
 * Webhook events (incoming messages, statuses)
 */
router.post("/webhook", handleWebhook);

/**
 * Get messages
 * ?phoneNumber=919xxxxxxxxx&limit=50
 */
router.get("/messages", getMessages);

/**
 * Get contacts
 */
router.get("/contacts", getContacts);

export { router };
