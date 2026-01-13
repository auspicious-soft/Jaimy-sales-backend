import axios, { AxiosError } from "axios";

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL as string;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID as string;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN as string;

const headers = {
  Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
  "Content-Type": "application/json",
};

interface WhatsAppSuccessResponse {
  success: true;
  messageId?: string;
  data?: any;
}

interface WhatsAppErrorResponse {
  success: false;
  error: any;
}

type WhatsAppResponse = WhatsAppSuccessResponse | WhatsAppErrorResponse;

/**
 * Send normal text message
 */
export async function sendTextMessage(
  to: string,
  message: string
): Promise<WhatsAppResponse> {
  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      },
      { headers }
    );

    return {
      success: true,
      messageId: response.data?.messages?.[0]?.id,
      data: response.data,
    };
  } catch (error) {
    const err = error as AxiosError;
    console.error("WhatsApp Send Error:", err.response?.data || err.message);

    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

/**
 * Send template message
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string = "en"
): Promise<WhatsAppResponse> {
  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
        },
      },
      { headers }
    );

    return {
      success: true,
      messageId: response.data?.messages?.[0]?.id,
      data: response.data,
    };
  } catch (error) {
    const err = error as AxiosError;
    console.error("Template Send Error:", err.response?.data || err.message);

    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

/**
 * Mark message as read
 */
export async function markAsRead(
  messageId: string
): Promise<WhatsAppResponse> {
  try {
    await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      },
      { headers }
    );

    return { success: true };
  } catch (error) {
    const err = error as AxiosError;

    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}
