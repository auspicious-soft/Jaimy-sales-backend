import { Request, Response } from 'express';
import { hubspotContactModel } from '../models/hubspot-contact-schema';
import { pollFormSubmissions } from '../services/hubspot-polling-service';

export async function pollForm(req: Request, res: Response): Promise<void> {
  try {
    const { formGuid } = req.body;

    if (!formGuid) {
      res.status(400).json({
        success: false,
        error: 'formGuid is required',
      });
      return;
    }

    pollFormSubmissions(formGuid).catch(err => console.error('Poll error:', err));

    res.json({
      success: true,
      message: 'Polling started',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export async function getContactStats(req: Request, res: Response): Promise<void> {
  try {
    const [total, sent, pending, failed] = await Promise.all([
      hubspotContactModel.countDocuments(),
      hubspotContactModel.countDocuments({ whatsappStatus: 'sent' }),
      hubspotContactModel.countDocuments({ whatsappStatus: 'pending' }),
      hubspotContactModel.countDocuments({ whatsappStatus: 'failed' }),
    ]);

    res.json({
      success: true,
      stats: {
        total,
        sent,
        pending,
        failed,
        successRate: total > 0 ? ((sent / total) * 100).toFixed(2) + '%' : '0%',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export async function getHubSpotContacts(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      limit = "50",
      page = "1",
      whatsappStatus,
      search,
    } = req.query;

    const limitNum = parseInt(limit as string);
    const pageNum = parseInt(page as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (whatsappStatus) {
      query.whatsappStatus = whatsappStatus;
    }

    if (search) {
      const regex = new RegExp(search as string, "i");
      query.$or = [
        { email: regex },
        { firstName: regex },
        { lastName: regex },
      ];
    }

    const [contacts, total] = await Promise.all([
      hubspotContactModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      hubspotContactModel.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: contacts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}