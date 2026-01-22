import { Response } from "express";
import { httpStatusCode } from "src/lib/constant";
import { errorResponseHandler } from "src/lib/errors/error-response-handler";
import { messageTemplateModel } from "src/models/message-templates-schema";
import { AdminModel } from "src/models/admin-schema";

// Create a new message template
export const createMessageTemplateService = async (payload: any, res: Response) => {
    const { title, templateType, usedFor, content, remainderHours } = payload;

    // Validate required fields
    if (!title || !content) {
      return errorResponseHandler("Title and content are required", httpStatusCode.BAD_REQUEST, res);
    }

    const newTemplate = new messageTemplateModel({
      title,
      templateType: templateType || "Reminder",
      usedFor: usedFor || "Email",
      content,
      remainderHours: remainderHours || 0,
    });

    await newTemplate.save();

    return {
      success: true,
      message: "Message template created successfully",
      data: newTemplate,
    };
 
};

// Get all message templates
export const getAllMessageTemplatesService = async (res: Response) => {
    const templates = await messageTemplateModel.find().sort({ createdAt: -1 });

    return {
      success: true,
      message: "Message templates retrieved successfully",
      data: templates,
      total: templates.length,
    };
 
};

// Get a single message template by ID
export const getMessageTemplateByIdService = async (id: string, res: Response) => {
    if (!id) {
      return errorResponseHandler("Template ID is required", httpStatusCode.BAD_REQUEST, res);
    }

    const template = await messageTemplateModel.findById(id);

    if (!template) {
      return errorResponseHandler("Message template not found", httpStatusCode.NOT_FOUND, res);
    }

    return {
      success: true,
      message: "Message template retrieved successfully",
      data: template,
    };
 
};

// Update a message template
export const updateMessageTemplateService = async (id: string, payload: any, res: Response) => {
    if (!id) {
      return errorResponseHandler("Template ID is required", httpStatusCode.BAD_REQUEST, res);
    }

    const template = await messageTemplateModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!template) {
      return errorResponseHandler("Message template not found", httpStatusCode.NOT_FOUND, res);
    }

    return {
      success: true,
      message: "Message template updated successfully",
      data: template,
    };
  
};

// Delete a message template
export const deleteMessageTemplateService = async (id: string, res: Response) => {
    if (!id) {
      return errorResponseHandler("Template ID is required", httpStatusCode.BAD_REQUEST, res);
    }

    const template = await messageTemplateModel.findByIdAndDelete(id);

    if (!template) {
      return errorResponseHandler("Message template not found", httpStatusCode.NOT_FOUND, res);
    }

    return {
      success: true,
      message: "Message template deleted successfully",
      data: template,
    };
  
};

// Get templates by type
export const getMessageTemplatesByTypeService = async (templateType: string, res: Response) => {
    if (!templateType) {
      return errorResponseHandler("Template type is required", httpStatusCode.BAD_REQUEST, res);
    }

    const templates = await messageTemplateModel.find({ templateType }).sort({ createdAt: -1 });

    return {
      success: true,
      message: "Message templates retrieved successfully",
      data: templates,
      total: templates.length,
    };
  
};

// Get templates by usage type
export const getMessageTemplatesByUsageService = async (usedFor: string, res: Response) => {
    if (!usedFor) {
      return errorResponseHandler("Usage type is required", httpStatusCode.BAD_REQUEST, res);
    }

    const templates = await messageTemplateModel.find({ usedFor }).sort({ createdAt: -1 });

    return {
      success: true,
      message: "Message templates retrieved successfully",
      data: templates,
      total: templates.length,
    };
  
};

export const updateAdminDetailsService = async (id: string,payload: any, res: Response) => {

    const template = await AdminModel.findOneAndUpdate({_id: id}, { payload }, { new: true });

    if (!template) {
      return errorResponseHandler("Message template not found", httpStatusCode.NOT_FOUND, res);
    }

    return {
      success: true,
      message: "Primary Channel updated successfully",
      data: template,
    };
 
}