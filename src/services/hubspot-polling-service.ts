import axios from "axios";
import { contactsModel } from "../models/contacts-schema";
import { formatPhoneNumber, isValidPhoneNumber, sendTemplateMessage } from "./whatsapp-service";
import { config } from "src/config/whatsapp";
import { hubspotContactModel } from "src/models/hubspot-contact-schema";
import { sendPasswordResetEmail, WhatsAppFailureNotificationEmail } from "src/utils/mails/mail";
import { convertToUTC } from "src/utils";
import { sendSms } from "src/utils/sendSms";
import { messagesModel } from "src/models/messages-schema";
import { getCountryFromNumber } from "src/lib/constant";

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


async function processFormSubmission(
  submission: HubSpotFormSubmission,
  formGuid: string
): Promise<void> {
  try {
    const email = findValue(submission.values, "email");
    const firstName = findValue(submission.values, "firstname");
    const lastName = findValue(submission.values, "lastname");
    const phoneRaw = findValue(submission.values, "phone");
    const company = findValue(submission.values, "company");
    const region =getCountryFromNumber(phoneRaw);
    if (!email || !phoneRaw) {
      console.log("⚠️ Missing email or phone, skipping");
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneRaw);
    if (!isValidPhoneNumber(formattedPhone)) {
      // console.log("⚠️ Invalid phone:", phoneRaw);
      return;
    }

    const fullName = `${firstName || ""} ${lastName || ""}`.trim();
    const submittedAt = convertToUTC(submission.submittedAt);

    /* ------------------ UPSERT (NO DUPLICATE KEY POSSIBLE) ------------------ */
    const contact = await hubspotContactModel.findOneAndUpdate(
		{ phone: phoneRaw },
		{
			$setOnInsert: {
				email,
				firstName,
				lastName,
        region,
				phone: phoneRaw,
				company,
				formId: formGuid,
				source: "hubspot",
				whatsappStatus: "pending",
				retryCount: 2,
				metadata: {
					submittedAt,
					pageUrl: submission.pageUrl,
				},
			},
		},
		{ upsert: true, new: true }
    );

    /* ---------------------------- ALREADY SENT ----------------------------- */
    if (contact.whatsappStatus === "sent") {
      // console.log("⏭️ WhatsApp already sent:", email);
      return;
    }

    /* ------------------------ RETRY EXHAUSTED → EMAIL ----------------------- */
    if (contact.whatsappStatus === "failed" && contact.retryCount <= 0) {
		const hasFailureEmailAlreadySent =
    Array.isArray(contact.metadata) &&
    contact.metadata.some(
      (m: any) => m.WhatsAppFailedEmailSent === true
    );

  if (hasFailureEmailAlreadySent) {
    // console.log("⏭️ Failure email already sent, skipping:", email);
    // await sendSms(phoneRaw, fullName, phoneRaw);
    return;
  }
    await WhatsAppFailureNotificationEmail(email, formattedPhone, fullName);

    await hubspotContactModel.findByIdAndUpdate(contact._id, {
    $push: {
      metadata: {
        WhatsAppFailedEmailAt: new Date(),
        WhatsAppFailedEmailSent: true,
      },
    },
    });

      // console.log("📧 Failure email sent:", email);
      return;
    }

    /* --------------------------- SYNC CONTACTS ----------------------------- */
    await contactsModel.findOneAndUpdate(
      { phoneNumber: phoneRaw },
      {
        region,
        hubspotId: contact._id,
        phoneNumber: phoneRaw,
        name: fullName,
        email,
        lastMessageSentAt: new Date(),
        lastMessageAt: new Date(),
      },
      { upsert: true }
    );

    /* --------------------------- SEND WHATSAPP ------------------------------ */
    const result = await sendTemplateMessage(
      formattedPhone,
      "welcome_template",
      "en",
      [
        {
          type: "body",
          parameters: [{ type: "text", text: fullName }],
        },
      ]
    );

    if (result.success) {
      await hubspotContactModel.findByIdAndUpdate(contact._id, {
        whatsappTemplateSent: true,
        whatsappMessageId: result.messageId,
        whatsappStatus: "sent",
        $push: {
              metadata: {
                WhatsAppWelcomeSentAt: new Date(),
              },
            },
      });
      // await messagesModel.create({
      //   contactId: contact._id,
      //   messageId: result.messageId,
      //   sentAt: new Date(),
      //   from: config.whatsapp.phoneNumberId,
      //   to: formattedPhone,
      //   body: result.message,
      //   direction: "outbound",
      //   status: "sent",
      //   metadata: {
      //     type: "Welcome",
      //   },
      // })

      // console.log("✅ WhatsApp sent:", email);
    } else {
      await hubspotContactModel.findByIdAndUpdate(contact._id, {
        whatsappStatus: "failed",
        $inc: { retryCount: -1 },
      });

      console.error("❌ WhatsApp failed:", email);
    }
  } catch (error: any) {
    console.error("❌ Process submission error:", error.message);
  }
}




export function startPollingService(formGuids: string[]): void {
	console.log("🚀 Starting HubSpot polling service...");
	console.log("📋 Monitoring forms:", formGuids);

	setInterval(
		async () => {
			for (const formGuid of formGuids) {
				await pollFormSubmissions(formGuid);
			}
		},
		1 * 60 * 1000,
	); // 30 seconds - 2 min 2 * 60 * 1000

	setTimeout(async () => {
		for (const formGuid of formGuids) {
			await pollFormSubmissions(formGuid);
		}
	}, 5000);
}

function findValue(values: Array<{ name: string; value: string }>, name: string): string | undefined {
	return values.find((v) => v.name === name)?.value;
}
