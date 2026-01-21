import axios from "axios";
import { contactsModel } from "../models/contacts-schema";
import { formatPhoneNumber, isValidPhoneNumber, sendTemplateMessage } from "./whatsapp-service";
import { config } from "src/config/whatsapp";
import { hubspotContactModel } from "src/models/hubspot-contact-schema";

const HUBSPOT_API_KEY = config.hubspot.apiKey;
const HUBSPOT_API_URL = "https://api.hubapi.com";
const formOffsets: Record<string, number | undefined> = {};

interface HubSpotFormSubmission {
	submittedAt: string;
	values: Array<{
		name: string;
		value: string;
	}>;
	pageUrl: string;
}

export async function pollFormSubmissions(formGuid: string): Promise<void> {
	try {
		console.log("🔄 Polling HubSpot form submissions for:", formGuid);

		// const after = new Date(Date.now() - 5 * 60 * 1000).getTime();

		const response = await axios.get(`${HUBSPOT_API_URL}/form-integrations/v1/submissions/forms/${formGuid}`, {
			headers: {
				Authorization: `Bearer ${HUBSPOT_API_KEY}`,
			},
			params: {
				offset: formOffsets[formGuid],
				limit: 50,
			},
		});

		const submissions: HubSpotFormSubmission[] = response.data.results || [];

		console.log(`📊 Found ${submissions.length} new submissions`);

		for (const submission of submissions) {
			await processFormSubmission(submission, formGuid);
		}
		if (response.data.hasMore && response.data.offset !== undefined) {
			formOffsets[formGuid] = response.data.offset;
		}
	} catch (error: any) {
		console.error("❌ Polling error:", error.response?.data || error.message);
	}
}

async function processFormSubmission(submission: HubSpotFormSubmission, formGuid: string): Promise<void> {
	try {
		const email = findValue(submission.values, "email");
		const firstName = findValue(submission.values, "firstname");
		const lastName = findValue(submission.values, "lastname");
		const phone = findValue(submission.values, "phone");
		const company = findValue(submission.values, "company");

		if (!email || !phone) {
			console.log("⚠️ Skipping submission - missing email or phone");
			return;
		}

		const formattedPhone = formatPhoneNumber(phone);

		if (!isValidPhoneNumber(formattedPhone)) {
			console.log("⚠️ Invalid phone number:", phone);
			return;
		}

		const existing = await hubspotContactModel.findOne({
			email,
			phone: formattedPhone,
			"metadata.submittedAt": submission.submittedAt,
		});

		if (existing) {
			console.log("⏭️ Already processed:", email);
			return;
		}

		const contact = await hubspotContactModel.create({
			email,
			firstName,
			lastName,
			phone: formattedPhone,
			company,
			formId: formGuid,
			source: "hubspot",
			whatsappStatus: "pending",
			metadata: {
				submittedAt: submission.submittedAt,
				pageUrl: submission.pageUrl,
			},
		});
		const fullName = `${firstName} ${lastName}`.trim();
		console.log("✅ Contact created:", contact._id);

		await contactsModel.findOneAndUpdate(
			{ phoneNumber: formattedPhone },
			{
				phoneNumber: formattedPhone,
				name: `${firstName || ""} ${lastName || ""}`.trim(),
				lastMessageAt: new Date(),
			},
			{ upsert: true, new: true },
		);

		const result = await sendTemplateMessage(formattedPhone, "hello_world", "en_US"
		// 	, [
		// 	{
		// 		type: "body",
		// 		parameters: [{ type: "text", text: fullName }],
		// 	},
		// ]
	);

		if (result.success) {
			await hubspotContactModel.findByIdAndUpdate(contact._id, {
				whatsappTemplateSent: true,
				whatsappMessageId: result.messageId,
				whatsappStatus: "sent",
			});
			console.log("✅ WhatsApp sent to:", email);
		} else {
			await hubspotContactModel.findByIdAndUpdate(contact._id, {
				whatsappStatus: "failed",
			});
			console.error("❌ WhatsApp failed for:", email);
		}
	} catch (error: any) {
		console.error("❌ Process submission error:", error.message);
	}
}

export function startPollingService(formGuids: string[]): void {
	console.log("🚀 Starting HubSpot polling service...");
	console.log("📋 Monitoring forms:", formGuids);

	setInterval(async () => {
		for (const formGuid of formGuids) {
			await pollFormSubmissions(formGuid);
		}
	}, 1 * 60 * 1000); // 30 seconds - 2 min 2 * 60 * 1000

	setTimeout(async () => {
		for (const formGuid of formGuids) {
			await pollFormSubmissions(formGuid);
		}
	}, 5000);
}

function findValue(values: Array<{ name: string; value: string }>, name: string): string | undefined {
	return values.find((v) => v.name === name)?.value;
}
