import { Router } from "express";
import {
  createMessageTemplate,
  getAllMessageTemplates,
  getMessageTemplateById,
  updateMessageTemplate,
  deleteMessageTemplate,
  getMessageTemplatesByType,
  getMessageTemplatesByUsage,
} from "src/controllers/message-template-controller";
import { checkAuth } from "src/middleware/check-auth";

const router = Router();

// Apply authentication middleware to all routes
// router.use(checkAuth);

// Create a new message template
router.post("/", createMessageTemplate);

// Get all message templates
router.get("/", getAllMessageTemplates);

// Get templates by type (query parameter)
router.get("/filter/by-type", getMessageTemplatesByType);

// Get templates by usage (query parameter)
router.get("/filter/by-usage", getMessageTemplatesByUsage);

// Get a single message template by ID
router.get("/:id", getMessageTemplateById);

// Update a message template
router.patch("/:id", updateMessageTemplate);

// Delete a message template
router.delete("/:id", deleteMessageTemplate);

export { router };
