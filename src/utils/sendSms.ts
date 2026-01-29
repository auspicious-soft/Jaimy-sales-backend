import { twilioClient } from "src/lib/twilio";

export function whatsappFailureSmsTemplate(
  name?: string,
  phoneNumber?: string
) {
  return `Hi ${name ?? "there"},

We tried contacting you on WhatsApp at ${phoneNumber ?? "your number"}, but couldn't reach you.

This may be due to an incorrect number or network issue. Please resubmit your form with a valid WhatsApp number so we can assist you.

— Disstrikt`;
}

export async function sendSms(
  to: string,
  name?: string, phoneNumber?: string
) {
  return await twilioClient.messages.create({
    from: process.env.TWILIO_PHONE_NUMBERS!,
    to,
    body:whatsappFailureSmsTemplate(name, phoneNumber),
  });
}

