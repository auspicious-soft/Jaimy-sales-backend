import twilio from "twilio";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
} = process.env;

if (
  !TWILIO_ACCOUNT_SID ||
  !TWILIO_API_KEY ||
  !TWILIO_API_SECRET
) {
  throw new Error("❌ Twilio environment variables are missing");
}

export const twilioClient = twilio(
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  {
    accountSid: TWILIO_ACCOUNT_SID,
  }
);
