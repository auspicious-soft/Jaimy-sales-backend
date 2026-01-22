import * as React from 'react';
import { Html, Head, Container, Text } from "@react-email/components";

interface EmailProps {
  name?: string;
  phoneNumber?: string;
}

const WhatsAppFailureNotification: React.FC<EmailProps> = ({ name, phoneNumber }) => {
  return (
    <Html lang="en">
      <Head>
        <title>Disstrikt - Unable to Contact You</title>
      </Head>
      <Container style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ color: "#000" }}>We couldn't reach you on WhatsApp</h1>

        <Text style={{ color: "#000", marginBottom: '10px' }}>
          Hello {name || "there"},
        </Text>

        <Text style={{ color: "#000", marginBottom: '10px' }}>
          Thank you for submitting your form to Disstrikt. We tried to reach you on your WhatsApp number {phoneNumber || "provided"}, but we were unable to contact you. This could be due to an incorrect number or network issues.
        </Text>

        <Text style={{ color: "#000", marginBottom: '10px' }}>
          To ensure we can assist you, please resubmit your form with a valid WhatsApp number.
        </Text>

        <Text style={{ color: "#6c757d", marginTop: '20px' }}>
          📌 We appreciate your prompt attention and look forward to connecting with you!
        </Text>

        <Text style={{ color: "#6c757d", marginTop: '10px' }}>
          Thank you for choosing Disstrikt!
        </Text>
      </Container>
    </Html>
  );
};

export default WhatsAppFailureNotification;
