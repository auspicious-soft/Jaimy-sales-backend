// controllers/dashboard.controller.ts
import { Request, Response } from "express";
import { getDashboardData } from "src/services/dashboard-service";

export const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      country: req.query.country as string,
      source: req.query.source as "hubspot" | "manual" | "api",
      adminPhone: req.query.adminPhone as string,
    };

    const data = await getDashboardData(filters);
    return res.status(200).json(data);
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({ message: "Failed to load dashboard data" });
  }
};
