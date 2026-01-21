import { Request, Response } from "express";
import { httpStatusCode } from "src/lib/constant";
import { errorParser } from "src/lib/errors/error-response-handler";
import {
  createMessageTemplateService,
  getAllMessageTemplatesService,
  getMessageTemplateByIdService,
  updateMessageTemplateService,
  deleteMessageTemplateService,
  getMessageTemplatesByTypeService,
  getMessageTemplatesByUsageService,
  updateAdminDetailsService,
} from "src/services/message-template-service";

// Create a new message template
export const createMessageTemplate = async (req: Request, res: Response) => {
  try {
    const response = await createMessageTemplateService(req.body, res);
    return res.status(httpStatusCode.CREATED).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res
      .status(code || httpStatusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: message || "An error occurred" });
  }
};

// Get all message templates
export const getAllMessageTemplates = async (req: Request, res: Response) => {
  try {
    const response = await getAllMessageTemplatesService(res);
    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res
      .status(code || httpStatusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: message || "An error occurred" });
  }
};

// Get a single message template by ID
export const getMessageTemplateById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await getMessageTemplateByIdService(id, res);
    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res
      .status(code || httpStatusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: message || "An error occurred" });
  }
};

// Update a message template
export const updateMessageTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await updateMessageTemplateService(id, req.body, res);
    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res
      .status(code || httpStatusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: message || "An error occurred" });
  }
};


// Delete a message template
export const deleteMessageTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await deleteMessageTemplateService(id, res);
    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res
      .status(code || httpStatusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: message || "An error occurred" });
  }
};

// Get templates by type
export const getMessageTemplatesByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const response = await getMessageTemplatesByTypeService(type as string, res);
    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res
      .status(code || httpStatusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: message || "An error occurred" });
  }
};

// Get templates by usage type
export const getMessageTemplatesByUsage = async (req: Request, res: Response) => {
  try {
    const { usedFor } = req.query;
    const response = await getMessageTemplatesByUsageService(usedFor as string, res);
    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res
      .status(code || httpStatusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: message || "An error occurred" });
  }
};


export const updateAdminDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await updateAdminDetailsService(id, req.body, res);
    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res
      .status(code || httpStatusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: message || "An error occurred" });
  }
};