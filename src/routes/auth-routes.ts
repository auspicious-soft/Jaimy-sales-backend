import { Router } from 'express';
import { forgotPassword, login, newPassswordAfterOTPVerified, resendOTP, verifyOtpPasswordReset } from 'src/controllers/auth-controller';

const router = Router();

router.post("/login", login)
router.post("/verify-otp", verifyOtpPasswordReset)
router.post("/forgot-password", forgotPassword)
router.post("/new-password-otp-verified", newPassswordAfterOTPVerified)
router.post("/resend-otp", resendOTP)
export { router };