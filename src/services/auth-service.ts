import bcrypt from "bcryptjs";
import { Response } from "express";
import { customAlphabet } from "nanoid";
import { TokenError } from "passport-apple";
import { httpStatusCode } from "src/lib/constant";
import { errorResponseHandler } from "src/lib/errors/error-response-handler";
import { AdminModel } from "src/models/admin-schema";
import { passwordResetTokenModel } from "src/models/password-token-schema";
import { sendEmailVerificationMail, sendPasswordResetEmail } from "src/utils/mails/mail";
import { generatePasswordResetToken, getPasswordResetTokenByToken } from "src/utils/mails/token";

export const loginService = async (payload: any, res: Response) => {
  const { email, password } = payload;
  const countryCode = "+45";
//   const toNumber = Number(email);
//   const isEmail = isNaN(toNumber);
  let user: any = null;

  user = await AdminModel.findOne({ email: email }).select("+password");
   
  if (!user) return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return errorResponseHandler("Invalid password", httpStatusCode.UNAUTHORIZED, res);
  }
  const userObject = user.toObject();
  delete userObject.password;

  return {
    success: true,
    message: "Login successful",
    data: {
      user: userObject,
    },
  };
};

export const forgotPasswordService = async (email: string, res: Response) => {
    console.log('email: ', email);
  const admin = await AdminModel.findOne({ email: email }).select("+password");
  if (!admin) return errorResponseHandler("Email not found", httpStatusCode.NOT_FOUND, res);

  try {
    // Generate token data but don't save to DB yet
    const genId = customAlphabet('0123456789', 6);
    const token = genId();
    const expires = new Date(new Date().getTime() + 3600 * 1000);

    // First try to send the email
    await sendPasswordResetEmail(email, token, "eng");

    // Only after email is sent successfully, update the database
    const existingToken = await passwordResetTokenModel.findOne({ email });
    if (existingToken) {
      await passwordResetTokenModel.findByIdAndDelete(existingToken._id);
    }

    const newPasswordResetToken = new passwordResetTokenModel({
      email,
      token,
      expires
    });

    await newPasswordResetToken.save();

    return { success: true, message: "Password reset email sent with otp",token };
  } catch (error) {
    console.error("Error in admin password reset process:", error);
    return errorResponseHandler("Failed to send password reset email. Please try again later.", httpStatusCode.INTERNAL_SERVER_ERROR, res);
  }
};

export const newPassswordAfterOTPVerifiedService = async (payload: { password: string; token: string }, res: Response) => {
  const { password, token } = payload;

  const existingToken = await getPasswordResetTokenByToken(token);
  if (!existingToken) return errorResponseHandler("Invalid OTP", httpStatusCode.BAD_REQUEST, res);

  const hasExpired = new Date(existingToken.expires) < new Date();
  if (hasExpired) return errorResponseHandler("OTP expired", httpStatusCode.BAD_REQUEST, res);

  let existingAdmin: any;

  if (existingToken.email) {
    existingAdmin = await AdminModel.findOne({ email: existingToken.email });
  } else if (existingToken.phoneNumber) {
    existingAdmin = await AdminModel.findOne({ phoneNumber: existingToken.phoneNumber });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const response = await AdminModel.findByIdAndUpdate(existingAdmin._id, { password: hashedPassword }, { new: true });
  await passwordResetTokenModel.findByIdAndDelete(existingToken._id);

  return {
    success: true,
    message: "Password updated successfully",
    data: response,
  };
};

export const getAdminDetailsService = async (payload: any, res: Response) => {
  const results = await AdminModel.find();
  return {
    success: true,
    data: results,
  };
};
export const resendOtpService = async (email: any, res: Response) => {
	if (!email) {
		return errorResponseHandler("Email is required", httpStatusCode.BAD_REQUEST, res);
	}

	// Check if user exists
	const user = await AdminModel.findOne({ email });

	if (!user) {
		return errorResponseHandler("User not found", httpStatusCode.NOT_FOUND, res);
	}
	const existingToken = await passwordResetTokenModel.findOne({ email });
	if (existingToken) {
		await passwordResetTokenModel.findByIdAndDelete(existingToken._id);
	}
	// Generate new OTP
	const otp = await generatePasswordResetToken(email);

	// Send OTP via email
	await sendPasswordResetEmail(email, otp.token, "eng");

	return {
		success: true,
		message: "OTP sent successfully to your email",
        Token: otp.token
	};
};
export const verifyOtpPasswordResetService = async (token: string, res: Response) => {
	const existingToken = await getPasswordResetTokenByToken(token);
	if (!existingToken) return errorResponseHandler("Invalid token", httpStatusCode.BAD_REQUEST, res);
    
	const hasExpired = new Date(existingToken.expires) < new Date();
	if (hasExpired) return errorResponseHandler("OTP expired", httpStatusCode.BAD_REQUEST, res);
	return { success: true, message: "OTP verified successfully",token };
};
