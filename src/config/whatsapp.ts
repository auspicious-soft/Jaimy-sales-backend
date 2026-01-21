export const config = {
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN!,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  },
  webhook: {
    url: process.env.WEBHOOK_URL || 'https://your-domain.com/webhook',
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp',
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
  },
    hubspot: {
    apiKey: process.env.HUBSPOT_API_KEY || '',
    formGuids: (process.env.HUBSPOT_FORM_GUIDS || '').split(',').filter(Boolean),
  },
};