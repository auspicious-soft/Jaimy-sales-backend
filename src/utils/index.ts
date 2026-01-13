import axios from "axios";
import { configDotenv } from "dotenv";
import { Request, Response } from "express";

configDotenv();


export const checkValidAdminRole = (req: Request, res: Response, next: any) => {
  const { role } = req.headers;
  if (role !== "admin") return res.status(403).json({ success: false, message: "Invalid role" });
  else return next();
};

