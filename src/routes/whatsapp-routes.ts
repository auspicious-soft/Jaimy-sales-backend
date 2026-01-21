import { Router } from 'express';
import {
  sendMessage,
  sendTemplate,
  sendMedia,
  verifyWebhook,
  handleWebhook,
  getMessages,
  getContacts,
  markContactAsRead,
} from '../controllers/whatsapp-controller';

const router = Router();

// Webhook routes
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);

// Message routes
router.post('/send-message', sendMessage);
router.post('/send-template', sendTemplate);
router.post('/send-media', sendMedia);
router.get('/messages', getMessages);

// Contact routes
router.get('/contacts', getContacts);
router.patch('/contacts/:phoneNumber/read', markContactAsRead);


export { router };
