import axios from "axios";
import { configDotenv } from "dotenv";
import { Request, Response } from "express";

configDotenv();


export const checkValidAdminRole = (req: Request, res: Response, next: any) => {
  const { role } = req.headers;
  if (role !== "admin") return res.status(403).json({ success: false, message: "Invalid role" });
  else return next();
};

// export const renderTemplate = (
//   template: string,
//   variables: Record<string, string>
// ): string => {
//   let rendered = template;

//   for (const [key, value] of Object.entries(variables)) {
//     const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
//     rendered = rendered.replace(regex, value);
//   }

//   return rendered;
// };

export const renderTemplate = (
  template: string,
  variables: Record<string, string | undefined>
): string => {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    return variables[key] ?? `{{${key}}}`;
  });
};


export const htmlToText = (html: string): string => {
  return html
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
};

export function convertToUTC(timestampMs: any): string {
    const date = new Date(timestampMs);
    return date.toISOString(); // UTC format
}