const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(1, 'username or email is required'),
  password: z.string().min(1, 'password is required'),
});

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(['JobSeeker', 'Recruiter', 'Admin']).optional(),
  phone: z.string().max(20).optional(),
  referralCode: z.string().max(100).optional(),
  companyType: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  website: z.string().max(500).optional().refine(
    (val) => !val || val === '' || /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(val),
    { message: 'Invalid website URL format' }
  ),
  gstNumber: z.string().max(20).optional().refine(
    (val) => !val || val === '' || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val),
    { message: 'Invalid GST number format' }
  ),
  preferredLocation: z.string().max(100).optional(),
  preferredJobType: z.string().max(100).optional(),
});

const otpVerificationSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4).max(6),
});

const resendOtpSchema = z.object({
  email: z.string().email(),
});

const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(128),
});

module.exports = {
  loginSchema,
  registerSchema,
  otpVerificationSchema,
  resendOtpSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
};


