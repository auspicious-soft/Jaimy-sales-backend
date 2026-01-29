export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If number doesn't have country code and starts with 0, remove leading 0
  // Example: 09729360795 -> 9729360795 (assuming India, add 91)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '+91' + cleaned.substring(1);
  }
  
  return cleaned;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  // Valid international number should be 10-15 digits
  return formatted.length >= 10 && formatted.length <= 15 && /^\d+$/.test(formatted);
}

/**
 * Display phone number in readable format
 */
export function displayPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as +XX XXXXX XXXXX for better readability
  if (cleaned.length >= 12) {
    return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 7)} ${cleaned.substring(7)}`;
  }
  
  return `+${cleaned}`;
}

// ============================================================================
// FILE: src/services/whatsapp-service.ts
// ============================================================================
import axios, { AxiosError } from 'axios';
import { config } from 'src/config/whatsapp';
const { apiUrl, phoneNumberId, accessToken } = config.whatsapp;

const headers = {
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
};

export interface WhatsAppSuccessResponse {
  success: true;
  messageId?: string;
  data?: any;
}

export interface WhatsAppErrorResponse {
  success: false;
  error: any;
}

export type WhatsAppResponse = WhatsAppSuccessResponse | WhatsAppErrorResponse;

/**
 * Send text message
 */
export async function sendTextMessage(
  to: string,
  message: string
): Promise<WhatsAppResponse> {
  try {
    console.log('📤 Sending message:', {
      to,
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      phoneNumberId,
    });

    const response = await axios.post(
      `${apiUrl}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          preview_url: false,
          body: message,
        },
      },
      { headers }
    );

    console.log('✅ Message sent successfully:', {
      messageId: response.data?.messages?.[0]?.id,
      to,
    });

    return {
      success: true,
      messageId: response.data?.messages?.[0]?.id,
      data: response.data,
    };
  } catch (error) {
    const err = error as AxiosError;
    console.error('❌ WhatsApp Send Error:', {
      status: err.response?.status,
      data: JSON.stringify(err.response?.data, null, 2),
      message: err.message,
    });
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}
/**
 * fetch message templates
 */
export async function fetchTemplates() {
  const response = await axios.get(
    `${apiUrl}/${phoneNumberId}/message_templates`,
    { headers }
  );

  return response.data.data;
}

export async function fetchTemplateByName(
  templateName: string,
  language: string
) {
  const response = await axios.get(
    `${apiUrl}/${phoneNumberId}/message_templates`,
    {
      headers,
      params: {
        name: templateName,
        language,
        status: 'APPROVED',
      },
    }
  );

  return response.data.data?.[0] || null;
}
export function extractTemplateBody(template: any): string | null {
  const body = template.components?.find(
    (c: any) => c.type === 'BODY'
  );

  return body?.text || null;
}
// services/templateCache.ts
const templateCache = new Map<string, string>();

export async function syncTemplates() {
  const templates = await fetchTemplates();

  for (const template of templates) {
    const body = extractTemplateBody(template);
    if (!body) continue;

    const key = `${template.name}:${template.language}`;
    templateCache.set(key, body);
  }
}

export function getCachedTemplate(
  name: string,
  language: string
): string | null {
  return templateCache.get(`${name}:${language}`) || null;
}

/**
 * Send template message
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string = 'en',
  components?: any[]
): Promise<WhatsAppResponse> {
  try {
    console.log('📤 Sending template message:', {
      to,
      templateName,
      languageCode,
    });

    const payload: any = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
      },
    };

    if (components && components.length > 0) {
      payload.template.components = components;
    }

    const response = await axios.post(
      `${apiUrl}/${phoneNumberId}/messages`,
      payload,
      { headers }
    );

    console.log('✅ Template sent successfully:', {
      messageId: response.data?.messages?.[0]?.id,
      to,
    });

    return {
      success: true,
      messageId: response.data?.messages?.[0]?.id,
      data: response.data,
    };
  } catch (error) {
    const err = error as AxiosError;
    console.error('❌ Template Send Error:', {
      status: err.response?.status,
      data: JSON.stringify(err.response?.data, null, 2),
      message: err.message,
    });
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

/**
 * Mark message as read
 */
export async function markAsRead(messageId: string): Promise<WhatsAppResponse> {
  try {
    await axios.post(
      `${apiUrl}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      },
      { headers }
    );

    console.log('✅ Message marked as read:', messageId);
    return { success: true };
  } catch (error) {
    const err = error as AxiosError;
    console.error('❌ Mark as Read Error:', err.response?.data || err.message);
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

/**
 * Send media message (image, video, document, audio)
 */
export async function sendMediaMessage(
  to: string,
  mediaType: 'image' | 'video' | 'document' | 'audio',
  mediaUrl: string,
  caption?: string
): Promise<WhatsAppResponse> {
  try {
    console.log('📤 Sending media message:', {
      to,
      mediaType,
      mediaUrl,
    });

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: mediaType,
      [mediaType]: {
        link: mediaUrl,
      },
    };

    if (caption && (mediaType === 'image' || mediaType === 'video' || mediaType === 'document')) {
      payload[mediaType].caption = caption;
    }

    const response = await axios.post(
      `${apiUrl}/${phoneNumberId}/messages`,
      payload,
      { headers }
    );

    console.log('✅ Media sent successfully:', {
      messageId: response.data?.messages?.[0]?.id,
      to,
    });

    return {
      success: true,
      messageId: response.data?.messages?.[0]?.id,
      data: response.data,
    };
  } catch (error) {
    const err = error as AxiosError;
    console.error('❌ Media Send Error:', {
      status: err.response?.status,
      data: JSON.stringify(err.response?.data, null, 2),
      message: err.message,
    });
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}
