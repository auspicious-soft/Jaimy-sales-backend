
import express from "express";
import cors from "cors";
import http from 'http';

// import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db";
// import admin from "firebase-admin"
import bodyParser from "body-parser";
import { appRoutes, authRoutes, hubspotRoutes, messageTemplateRoutes, whatsappRoutes } from "./routes";
import { startPollingService } from "./services/hubspot-polling-service";
import { startReminderCronJob } from "./services/reminder-cron-service";
import mongoose from "mongoose";
import { config } from "./config/whatsapp";
import { initSocket } from "./lib/socket";

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url); // <-- Define __filename
const __dirname = path.dirname(__filename); // <-- Define __dirname
// const serviceAccount = require(path.join(__dirname, 'config/firebase-adminsdk.json'));

const PORT = process.env.PORT || 8080;
const app = express();

app.use(express.json());
app.set("trust proxy", true);
app.use(
	bodyParser.json({
		verify: (req: any, res, buf) => {
			req.rawBody = buf.toString();
		},
	}),
);
// app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

app.use(
	cors({
		origin: "*",
		methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
		credentials: true,
	}),
);

var dir = path.join(__dirname, "static");
app.use(express.static(dir));
// const server = http.createServer(app);

// initSocket(server);

// server.listen(8001, () => {
//   console.log('Server running');
// });
var uploadsDir = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsDir));

// connectDB();

app.get("/", (_, res: any) => {
	res.send("Hello world entry point 🚀✅");
});

app.use("/api/app", appRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/hubspot", hubspotRoutes);
app.use("/api/message-templates", messageTemplateRoutes);
app.use("/api/auth", authRoutes);

connectDB();

startReminderCronJob();

const server = http.createServer(app);

initSocket(server); // attach socket here

server.listen(config.server.port, () => {
	console.log(`🚀 Server running on port ${config.server.port}`);
	console.log(`📱 WhatsApp API URL: ${config.whatsapp.apiUrl}`);
	console.log(`📞 Phone Number ID: ${config.whatsapp.phoneNumberId}`);
	console.log(`🔗 Webhook URL: ${config.webhook.url}`);
	console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);

	const formGuids = config.hubspot.formGuids;

	if (formGuids.length > 0) {
		console.log("🔄 Starting HubSpot polling service...");
		startPollingService(formGuids);
	} else {
		console.log("⚠️ No HubSpot forms configured.");
		console.log("💡 Add HUBSPOT_FORM_GUIDS to .env to enable auto-polling");
	}
});
