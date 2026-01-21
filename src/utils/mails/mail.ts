import { Resend } from "resend";
import { configDotenv } from "dotenv";
import ForgotPasswordEmail from "./templates/forget-password";
import LoginCredentials from "./templates/login-credentials";
import VerifyEmail from "./templates/email-verification";

configDotenv()
const resend = new Resend(process.env.RESEND_API_KEY)


export const sendPasswordResetEmail = async (email: string, token: string, language: string = "eng") => {
   try {
      const result = await resend.emails.send({
         from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
         to: email,
         subject: "Reset your password",
         react: ForgotPasswordEmail({ otp: token , language }),
      });

      if (!result || result.error) {
         console.error("Failed to send password reset email:", result?.error);
         throw new Error("Failed to send password reset email");
      }

      return result;
   } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error; // Re-throw to be handled by the caller
   }
}
export const sendLoginCredentialsEmail = async (email: string, password: string) => {
   try {
      const result = await resend.emails.send({
         from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
         to: email,
         subject: "Login Credentials",
         react: LoginCredentials({ email: email || "", password: password || "" }),
      });

      if (!result || result.error) {
         console.error("Failed to send login credentials email:", result?.error);
         throw new Error("Failed to send login credentials email");
      }

      return result;
   } catch (error) {
      console.error("Error sending login credentials email:", error);
      throw error; // Re-throw to be handled by the caller
   }
}
export const sendEmailVerificationMail = async (email:string,otp: string) => {
   try {
      const result = await resend.emails.send({
         from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
         to: email,
         subject: "Verification Code",
         react: VerifyEmail({ otp: otp, language: "eng" })
      });

      if (!result || result.error) {
         console.error("Failed to send email verification:", result?.error);
         throw new Error("Failed to send email verification");
      }

      return result;
   } catch (error) {
      console.error("Error sending email verification:", error);
      throw error; // Re-throw to be handled by the caller
   }
}

export const sendContactMailToAdmin = async (payload: { name: string, email: string, message: string, phoneNumber: string }) => {
    try {
        const result = await resend.emails.send({
            from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
            to: payload.email,
            subject: "Contact Us | New Message",
            html: `
                <h3>From: ${payload.name}</h3>
                <h3>Email: ${payload.email}</h3>
                <h3>Phone Number: ${payload.phoneNumber}</h3>
                <p>${payload.message}</p>
            `
        });

        if (!result || result.error) {
            console.error("Failed to send contact mail to admin:", result?.error);
            throw new Error("Failed to send contact mail to admin");
        }

        return result;
    } catch (error) {
        console.error("Error sending contact mail to admin:", error);
        throw error; // Re-throw to be handled by the caller
    }
}

export const sendLatestUpdatesEmail = async (email: string, title: string, message: string) => {
    try {
        const result = await resend.emails.send({
            from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
            to: email,
            subject: title,
            html: `
                <h3>${title}</h3>
                <p>${message}</p>
            `
        });

        if (!result || result.error) {
            console.error("Failed to send latest updates email:", result?.error);
            throw new Error("Failed to send latest updates email");
        }

        return result;
    } catch (error) {
        console.error("Error sending latest updates email:", error);
        throw error; // Re-throw to be handled by the caller
    }
};
export const addedUserCreds = async (payload: any) => {
    try {
        const result = await resend.emails.send({
            from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
            to: payload.email,
            subject: "User Credentials",
            text: `Hello ${payload.name ? payload.name.eng :payload.fullName.eng},\n\nYour account has been created with the following credentials:\n\nEmail: ${payload.email}\nPassword: ${payload.password}\nRole: ${payload.role}\n\nPlease keep this information secure.`,
        });

        if (!result || result.error) {
            console.error("Failed to send user credentials email:", result?.error);
            throw new Error("Failed to send user credentials email");
        }

        return result;
    } catch (error) {
        console.error("Error sending user credentials email:", error);
        throw error; // Re-throw to be handled by the caller
    }
}