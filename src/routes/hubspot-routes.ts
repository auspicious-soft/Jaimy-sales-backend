import { Router } from 'express';
import {
  pollForm,
  getContactStats,
  getHubSpotContacts,
} from '../controllers/hubspot-controller';

const router = Router();

router.post('/poll', pollForm);
router.get('/stats', getContactStats);
router.get('/contacts', getHubSpotContacts);

export { router };