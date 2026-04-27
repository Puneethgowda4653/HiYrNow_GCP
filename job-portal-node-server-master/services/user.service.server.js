const jobPostingModelServer = require("../models/job-posting/job-posting.model.server");
const mongoose = require("mongoose");
const projectModelServer = require("./../models/project/project.model.server");
const { sendEmail, sendResetEmail } = require("./email.service");
const bcrypt = require("bcrypt");
const jobApplicationSchema = require("../models/job-application/job-application.schema.server");
var JobApplication = mongoose.model("JobApplication", jobApplicationSchema);
var skillSchema = require("../models/skill/skill.schema.server");
var Skill = mongoose.model("Skill", skillSchema);
const ProfileViewHistory = require("../models/profile-view-history/ProfileViewHistory.schema.server.js");
const {
  purchasePoints,
  deductPoints,
  FEATURE_COSTS,
} = require("./credit-points.service.server");
const creditPointsSchema = require("../models/credit-points/credit-points.model.server");
const recruiterDetailModel = require('../models/recruiter-detail/recruiter-detail.model.server');
const planModel = require('../models/pricing-plan/plan.model.server');
const usage = require('../utils/plan-usage');
const seedPlans = require('../utils/seed-plans.json');

async function ensurePlansSeeded() {
  try {
    const plans = await planModel.findAllPlans();
    const existingCodes = new Set((plans || []).map((plan) => plan.code));
    for (const seed of seedPlans) {
      if (!existingCodes.has(seed.code)) {
        await planModel.createPlan(seed);
      }
    }
  } catch (error) {
    console.error('Failed to ensure plans are seeded', error);
  }
}

async function assignEarlyBirdPlanToRecruiter(recruiterDetail) {
  try {
    if (!recruiterDetail?._id) {
      return;
    }

    await ensurePlansSeeded();
    let earlyBirdPlan = await planModel.findPlanByCode('earlybird');
    if (!earlyBirdPlan) {
      const seedPlan = seedPlans.find((plan) => plan.code === 'earlybird');
      if (seedPlan) {
        earlyBirdPlan = await planModel.createPlan(seedPlan);
      }
    }

    if (!earlyBirdPlan?._id) {
      console.warn('Early Bird plan unavailable; skipping default assignment');
      return;
    }

    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 6);

    const usageState = { usage: recruiterDetail.usage };
    usage.resetUsage(usageState);

    await recruiterDetailModel.updateRecruiterDetail(recruiterDetail._id, {
      plan: earlyBirdPlan._id,
      planStartDate: now,
      planEndDate: end,
      billingCycle: 'promo',
      isCustomPlan: false,
      usage: usageState.usage,
      usageCycleStart: now,
    });
  } catch (error) {
    console.error('Failed to assign Early Bird plan to recruiter', error);
  }
}
const referralModel = require('../models/referral/referral.model.server');
const passport = require("../passport-setup.js");
const crypto = require("crypto");
const userSchema = require("../models/user/user.schema.server.js");
const nodemailer = require('nodemailer');
const { validateBody } = require('../middleware/validate');
const {
  loginSchema,
  registerSchema,
  otpVerificationSchema,
  resendOtpSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} = require('../validators/user.validator');

// Add OTP configuration
const OTP_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const OTP_LENGTH = 6;

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Function to generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Function to send OTP via email
async function sendOTPEmail(email, otp) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for Registration',
    text: `Your OTP for registration is: ${otp}. This OTP will expire in 5 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Your OTP for Registration</h2>
        <p>Your OTP code is: <strong>${otp}</strong></p>
        <p>This OTP will expire in 5 minutes.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this OTP, please ignore this email.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = function (app) {
  // Import authentication and RBAC middleware
  const { requireAuth, requireVerified } = require("../middleware/auth");
  const { requireAdmin, requireOwnershipOrAdmin } = require("../middleware/rbac");
  
  var userModel = require("./../models/user/user.model.server");
  var recruiterModel = require("./../models/recruiter-detail/recruiter-detail.model.server");
  var experienceModel = require("./../models/experience/experience.model.server");
  var educationModel = require("./../models/education/education.model.server");
  var skillsModel = require("./../models/skill/skill.model.server");
  var resumepdf = require("./../models/resume-upload/resume-upload.model.server");
  var projectsModel = require("./../models/project/project.model.server");
  //  var  skillsModel  = require('./../models/skill/skill.model.server');
  const UserActivity = require("./../models/user/UserActivity.schema.server.js");

  // admin access - using RBAC middleware
  app.get("/api/user", requireAdmin, findAllUsers);
  app.get("/api/user/:userId", findUserById);
  app.get("/api/users/:username", findUserByUsername);
  app.get("/api/pending", requireAdmin, findPendingRecruiters);
  app.post("/api/user", requireAdmin, createUser);
  app.delete("/api/user/:userId", requireAdmin, deleteUser);
  app.post("/api/approve/:userId", requireAdmin, approveRecruiter);
  app.post("/api/premium/approve/:userId", requireAdmin, grantPremiumAccess);
  app.post("/api/premium/revoke/:userId", requireAdmin, revokePremiumAccess);
  app.get("/api/user/user-profile/:userId", getUserProfileById);
  app.get("/api/user/details/:userId", getUserDetails);
  app.get("/api/profile/score/:userId", getProfileCompletionScore);
  // app.get("/api/dashboard/:userId", getDashboardData);
  // users
  app.post("/api/login", validateBody(loginSchema), login);
  app.post("/api/register", validateBody(registerSchema), register);
  app.post("/api/summit/signup", summitSignup);
  app.get("/api/profile", requireAuth, getProfile);
  app.get("/api/profile/recruiter", requireAuth, getRecruiterProfile);
  app.post("/api/logout", requireAuth, logout);
  app.put("/api/profile", requireAuth, updateProfile);
  app.delete("/api/user", requireAuth, deleteProfile);

  // async function getDashboardData(req, res) {
  //   try {
  //     const userId = req.params.userId;

  //     // Fetch dashboard stats
  //     const totalApplications = await JobApplication.countDocuments({
  //       user: userId,
  //     });
  //     const totalInterviews = await JobApplication.countDocuments({
  //       user: userId,
  //       status: "Interview Scheduled",
  //     });
  //     const totalOffers = await JobApplication.countDocuments({
  //       user: userId,
  //       status: "Offer Received",
  //     });

  //     // Fetch recent applications
  //     const recentApplications = await JobApplication.find({ user: userId })
  //       .sort({ createdAt: -1 })
  //       .limit(5)
  //       .populate("jobPosting", "title company");

  //     // Fetch upcoming interviews
  //     const upcomingInterviews = await JobApplication.find({
  //       user: userId,
  //       status: "Interview Scheduled",
  //       interviewDate: { $gte: new Date() },
  //     })
  //       .sort({ interviewDate: 1 })
  //       .limit(5)
  //       .populate("jobPosting", "title company");

  //     // Fetch application activity (last 30 days)
  //     const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  //     const applicationActivity = await JobApplication.aggregate([
  //       { $match: { user: userId, createdAt: { $gte: thirtyDaysAgo } } },
  //       {
  //         $group: {
  //           _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
  //           count: { $sum: 1 },
  //         },
  //       },
  //       { $sort: { _id: 1 } },
  //     ]);

  //     // Fetch skills data
  //     const skills = await Skill.find({ user: userId });
  //     const skillsData = skills.map((skill) => ({
  //       name: skill.name,
  //       level: skill.level,
  //     }));

  //     res.json({
  //       stats: {
  //         totalApplications,
  //         totalInterviews,
  //         totalOffers,
  //       },
  //       recentApplications,
  //       upcomingInterviews,
  //       applicationActivity,
  //       skillsData,
  //     });
  //   } catch (error) {
  //     res.status(500).json({ message: "Error fetching dashboard data" });
  //   }
  // }
  function createUser(req, res) {
    // Admin check is already done by requireAdmin middleware
    var user = req.body;
    userModel.findUserByUsername(user.username).then(function (u) {
      if (u != null) {
        res.json({ status: false });
      } else {
        userModel.createUser(user).then(function (user) {
          userModel.createUser(user).then(function () {
            res.send({ status: true });
          });
        });
      }
    });
  }
  function findAllUsers(req, res) {
    // Admin check is already done by requireAdmin middleware
    userModel.findAllUsers().then(function (user) {
      res.send(user);
    });
  }
  function findUserById(req, res) {
    var userId = req.params["userId"];
    userModel.findUserById(userId).then(function (user) {
      res.json(user);
    });
  }

  function findUserByUsername(req, res) {
    const username = req.params["username"]; // Extract username from route params
    userModel
      .findUsername(username) // Call the userModel's findUsername method
      .then((user) => {
        if (user) {
          res.status(200).json(user); // Send user details if found
        } else {
          res.status(404).json({ message: "User not found" }); // User not found
        }
      })
      .catch((error) => {
        console.error("Error finding user:", error);
        res.status(500).json({ message: "Internal server error" }); // Handle errors
      });
  }

  function findPendingRecruiters(req, res) {
    // Admin check is already done by requireAdmin middleware
    userModel.findPendingRecruiters().then(function (user) {
      res.json(user);
    });
  }

  function getClientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    return forwarded ? forwarded.split(",")[0].trim() : req.ip;
  }

  function login(req, res) {
    var user = req.body;
    var identifier = user.username; // This can be either username or email
    var password = user.password;

    userModel
      .findUserByCredentials(identifier)
      .then((u) => {
        if (u != null) {
          bcrypt.compare(password, u.password, async function (err, result) {
            if (err) {
              return res.status(500).json({ error: "Internal Server Error" });
            }

            if (result) {
              if (
                u.role === "JobSeeker" ||
                u.role === "Admin" ||
                u.role === "Recruiter"
              ) {
                req.session["user"] = u;

                // Log the login activity
                try {
                  await UserActivity.create({
                    userId: u._id,
                    user: u.username,
                    activityType: "login",
                    ipAddress: req.ip, // Capture user's IP address
                    device: req.headers["user-agent"], // Capture browser/device info
                  });
                } catch (logError) {
                  console.error("Error logging user activity:", logError);
                }

                return res.json({ status: "success", role: u.role });
              } else {
                return res.json({
                  status: "Recruiter verification pending",
                  role: null,
                });
              }
            } else {
              return res.json({ status: "Invalid password", role: null });
            }
          });
        } else {
          return res.json({ status: "user does not exist", role: null });
        }
      })
      .catch(function (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: "Internal Server Error" });
      });
  }

  // function login(req, res) {
  //     var user = req.body;
  //     var identifier = user.username; // This can be either username or email
  //     console.log("$$$$$$$$$$$$$$$$",user.password)
  //     var password = user.password;
  //     userModel.findUserByCredentials(identifier, password)
  //         .then((u) => {
  //             if (u != null) {
  //                 if ((u.role === 'JobSeeker' || u.role === 'Admin') || (u.role === 'Recruiter' && u.requestStatus != 'Pending')) {
  //                     req.session['user'] = u;
  //                     res.json({ status: 'success', role: u.role });
  //                 } else {
  //                     res.json({ status: 'Recruiter verification pending', role: null });
  //                 }
  //             } else {
  //                 res.json({ status: 'user does not exist', role: null });
  //             }
  //         });
  // }
  // Function to send WhatsApp welcome message
  async function sendWhatsAppWelcomeMessage(phoneNumber, fullName, companyName) {
    try {
      const axios = require('axios');
      
      // Format phone number (remove +91, 0, spaces, dashes)
      let cleanedPhone = phoneNumber.replace(/[\s\-+]/g, '');
      if (cleanedPhone.startsWith('91') && cleanedPhone.length === 12) {
        cleanedPhone = cleanedPhone.substring(2);
      }
      if (cleanedPhone.startsWith('0')) {
        cleanedPhone = cleanedPhone.substring(1);
      }
      
      // Ensure it's 10 digits
      if (cleanedPhone.length !== 10) {
        console.error('Invalid phone number format:', phoneNumber);
        return false;
      }

      const whatsappNumber = `91${cleanedPhone}`; // Format: 91XXXXXXXXXX
      const message = `🎉 Welcome to HiYrNow, ${fullName}!

Thank you for joining our Pioneer Pass program! Your account for ${companyName} has been successfully created.

You now have access to:
✨ Premium features worth ₹25,000
📊 AI-powered candidate matching
🚀 Advanced recruitment tools

Get started: https://hiyrnow.in

Need help? Reply to this message or email us at info@hiyrnow.in

- Team HiYrNow`;

      const whatsappBusinessNumber = process.env.WHATSAPP_BUSINESS_NUMBER || '9535638107';
      const whatsappProvider = process.env.WHATSAPP_PROVIDER || 'twilio'; // 'twilio', 'meta', 'gupshup', etc.

      // Try different WhatsApp API providers based on configuration
      if (whatsappProvider === 'twilio') {
        // Twilio WhatsApp API
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || `whatsapp:+91${whatsappBusinessNumber}`;

        if (accountSid && authToken) {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
          const toNumber = `whatsapp:+${whatsappNumber}`;
          
          console.log('📤 Sending WhatsApp via Twilio...');
          console.log('From:', twilioWhatsAppNumber);
          console.log('To:', toNumber);
          
          // Check if using Twilio sandbox number
          if (twilioWhatsAppNumber.includes('14155238886')) {
            console.log('⚠️ WARNING: You are using a Twilio Sandbox number!');
            console.log('⚠️ The recipient must join the sandbox first by sending a message to this number with the join code.');
            console.log('⚠️ Check your Twilio Console for the join code (usually something like "join <code>").');
          }
          
          const response = await axios.post(
            twilioUrl,
            new URLSearchParams({
              From: twilioWhatsAppNumber,
              To: toNumber,
              Body: message
            }),
            {
              auth: {
                username: accountSid,
                password: authToken
              },
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            }
          );
          
          console.log('✅ WhatsApp message sent via Twilio');
          console.log('Message SID:', response.data.sid);
          console.log('Status:', response.data.status);
          console.log('To Number:', response.data.to);
          console.log('From Number:', response.data.from);
          
          // Check message status
          if (response.data.status === 'queued' || response.data.status === 'sent') {
            console.log('✅ Message queued/sent successfully. Delivery may take a few moments.');
            
            // If using sandbox, provide important instructions
            if (twilioWhatsAppNumber.includes('14155238886')) {
              console.log('\n⚠️ IMPORTANT: You are using Twilio Sandbox!');
              console.log('⚠️ The recipient MUST join the sandbox first to receive messages.');
              console.log('⚠️ Steps to join:');
              console.log('   1. Open WhatsApp on the recipient phone');
              console.log('   2. Send a message to +1 415 523 8886');
              console.log('   3. Use the join code from your Twilio Console');
              console.log('   4. Once joined, messages will be delivered');
              console.log('\n📋 Check message delivery status in Twilio Console:');
              console.log(`   https://console.twilio.com/us1/monitor/logs/sms?msgSid=${response.data.sid}\n`);
            }
            
            // Check message status after 5 seconds to see if it was delivered
            setTimeout(async () => {
              try {
                const statusUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${response.data.sid}.json`;
                const statusResponse = await axios.get(statusUrl, {
                  auth: {
                    username: accountSid,
                    password: authToken
                  }
                });
                console.log('📊 Message Status Check (5 seconds later):');
                console.log('   Status:', statusResponse.data.status);
                console.log('   Error Code:', statusResponse.data.errorCode || 'None');
                console.log('   Error Message:', statusResponse.data.errorMessage || 'None');
                
                if (statusResponse.data.status === 'delivered') {
                  console.log('   ✅ Message delivered successfully!');
                } else if (statusResponse.data.status === 'failed' || statusResponse.data.status === 'undelivered') {
                  console.log('   ❌ Message delivery failed!');
                  if (statusResponse.data.errorCode === 63007) {
                    console.log('   ⚠️ Error 63007: Recipient not in sandbox. They must join first!');
                  }
                } else if (statusResponse.data.status === 'queued' || statusResponse.data.status === 'sent') {
                  console.log('   ⏳ Message still in queue. Check Twilio Console for final status.');
                }
              } catch (statusError) {
                console.log('   ⚠️ Could not check message status:', statusError.message);
              }
            }, 5000);
          } else {
            console.log('⚠️ Message status:', response.data.status);
            if (response.data.errorCode) {
              console.log('⚠️ Error Code:', response.data.errorCode);
              console.log('⚠️ Error Message:', response.data.errorMessage);
            }
          }
          
          return true;
        } else {
          console.warn('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
        }
      } else if (whatsappProvider === 'meta') {
        // WhatsApp Business API (Meta/Facebook)
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

        if (phoneNumberId && accessToken) {
          const metaUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
          const response = await axios.post(
            metaUrl,
            {
              messaging_product: 'whatsapp',
              to: whatsappNumber,
              type: 'text',
              text: {
                body: message
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log('WhatsApp message sent via Meta API:', response.data);
          return true;
        } else {
          console.warn('Meta WhatsApp API credentials not configured. Please set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env');
        }
      } else if (whatsappProvider === 'gupshup') {
        // Gupshup WhatsApp API
        const gupshupApiKey = process.env.GUPSHUP_API_KEY;
        const gupshupAppName = process.env.GUPSHUP_APP_NAME;

        if (gupshupApiKey && gupshupAppName) {
          const gupshupUrl = 'https://api.gupshup.io/sm/api/v1/msg';
          const response = await axios.post(
            gupshupUrl,
            new URLSearchParams({
              channel: 'whatsapp',
              source: gupshupAppName,
              destination: whatsappNumber,
              message: message,
              'src.name': gupshupAppName
            }),
            {
              headers: {
                'apikey': gupshupApiKey,
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            }
          );
          console.log('WhatsApp message sent via Gupshup:', response.data);
          return true;
        } else {
          console.warn('Gupshup credentials not configured. Please set GUPSHUP_API_KEY and GUPSHUP_APP_NAME in .env');
        }
      } else if (whatsappProvider === 'custom') {
        // Custom WhatsApp API endpoint
        const customApiUrl = process.env.WHATSAPP_API_URL;
        const customApiToken = process.env.WHATSAPP_API_TOKEN;

        if (customApiUrl && customApiToken) {
          const response = await axios.post(
            customApiUrl,
            {
              to: whatsappNumber,
              from: whatsappBusinessNumber,
              message: message
            },
            {
              headers: {
                'Authorization': `Bearer ${customApiToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log('WhatsApp message sent via custom API:', response.data);
          return true;
        } else {
          console.warn('Custom WhatsApp API not configured. Please set WHATSAPP_API_URL and WHATSAPP_API_TOKEN in .env');
        }
      }

      // Fallback: Create WhatsApp link for manual sending or testing
      const encodedMessage = encodeURIComponent(message);
      const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
      
      console.log('⚠️ WhatsApp provider not configured. Message details:');
      console.log('To:', `+${whatsappNumber}`);
      console.log('From:', `+91${whatsappBusinessNumber}`);
      console.log('Message:', message);
      console.log('\n📱 WhatsApp Link (for manual testing):');
      console.log(whatsappLink);
      console.log('\n💡 To enable automatic WhatsApp sending, configure one of the providers in .env file:');
      console.log('- For Twilio: Set WHATSAPP_PROVIDER=twilio, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN');
      console.log('- For Meta: Set WHATSAPP_PROVIDER=meta, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN');
      console.log('- For Gupshup: Set WHATSAPP_PROVIDER=gupshup, GUPSHUP_API_KEY, GUPSHUP_APP_NAME');
      console.log('- For Custom: Set WHATSAPP_PROVIDER=custom, WHATSAPP_API_URL, WHATSAPP_API_TOKEN');
      console.log('\n⚠️ Note: Restart your server after adding environment variables!\n');

      // Optionally, you can open the link programmatically or log it for manual use
      // For now, we'll just log it so you can test manually

      return false;
    } catch (error) {
      console.error('Error sending WhatsApp welcome message:', error.response?.data || error.message);
      return false;
    }
  }

  // Function to send email welcome message
  async function sendWelcomeEmail(email, fullName, companyName) {
    try {
      const welcomeEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to HiYrNow!</h1>
            </div>
            <div class="content">
              <p>Hi ${fullName},</p>
              <p>Thank you for joining our <strong>Pioneer Pass</strong> program! Your account for <strong>${companyName}</strong> has been successfully created.</p>
              
              <h3>What you get:</h3>
              <ul>
                <li>✨ Premium features worth ₹25,000 - <strong>FREE</strong></li>
                <li>📊 AI-powered candidate matching</li>
                <li>🚀 Advanced recruitment tools</li>
                <li>📈 Real-time analytics dashboard</li>
                <li>💼 Access to verified candidate profiles</li>
              </ul>
              
              <p style="text-align: center;">
                <a href="https://hiyrnow.in" class="button">Get Started Now</a>
              </p>
              
              <p>Need help? Our team is here for you. Just reply to this email or contact us at <a href="mailto:info@hiyrnow.in">info@hiyrnow.in</a></p>
              
              <p>Best regards,<br><strong>Team HiYrNow</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 HiYrNow. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"HiYrNow" <${process.env.EMAIL_USER || 'info@hiyrnow.in'}>`,
        to: email,
        subject: '🎉 Welcome to HiYrNow - Your Pioneer Pass is Active!',
        html: welcomeEmailHtml
      };

      await transporter.sendMail(mailOptions);
      console.log('Welcome email sent to:', email);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  async function summitSignup(req, res) {
    try {
      const { fullName, email, companyEmail, companyName, phoneNumber, password } = req.body;

      const primaryEmail = email || companyEmail;

      if (!fullName || !primaryEmail || !companyName || !password || !phoneNumber) {
        return res
          .status(400)
          .json({ success: false, message: "Missing required fields: fullName, email, companyName, phoneNumber, and password are required" });
      }

      // Validate phone number format
      let cleanedPhone = phoneNumber.replace(/[\s\-+]/g, '');
      if (cleanedPhone.startsWith('91') && cleanedPhone.length === 12) {
        cleanedPhone = cleanedPhone.substring(2);
      }
      if (cleanedPhone.startsWith('0')) {
        cleanedPhone = cleanedPhone.substring(1);
      }
      if (cleanedPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanedPhone)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid phone number format. Please provide a valid 10-digit Indian phone number." });
      }

      // Check if username or email already exists
      const existingUser = await userModel.findUserByUsername(
        companyName,
        primaryEmail
      );
      if (existingUser) {
        return res.json({
          success: false,
          message: "email already exists",
        });
      }

      // Hash password
      const hash = await bcrypt.hash(password, 10);

      // Split full name into first and last name
      const parts = fullName.trim().split(" ");
      const firstName = parts.shift();
      const lastName = parts.length > 0 ? parts.join(" ") : "";

      const newUser = {
        username: companyName,
        email: primaryEmail,
        phone: cleanedPhone, // Save cleaned phone number
        password: hash,
        role: "Recruiter",
        requestStatus: "Pending",
        accountCreatedAt: new Date(),
        isVerified: true,
      };

      const createdUser = await userModel.createUser(newUser);
      createdUser.password = "";

      // Create basic recruiter detail so dashboard features can work
      let recruiterDetail = null;
      try {
        const recruiterDetailData = {
          user: createdUser._id,
          username: companyName,
          companyWebsite: null,
          companyType: null,
          industry: null,
          firstName: firstName || null,
          lastName: lastName || null,
          title: "techsummit Registrant",
        };
        recruiterDetail = await recruiterModel.createRecruiterDetail(recruiterDetailData);
      } catch (detailError) {
        console.error("Error creating recruiter detail for summit signup:", detailError);
        // Do not fail signup if recruiter detail creation fails
      }

      if (recruiterDetail) {
        await assignEarlyBirdPlanToRecruiter(recruiterDetail);
      }

      // Send welcome email and WhatsApp message (non-blocking)
      Promise.all([
        sendWelcomeEmail(primaryEmail, fullName, companyName),
        sendWhatsAppWelcomeMessage(phoneNumber, fullName, companyName)
      ]).catch(err => {
        console.error('Error sending welcome messages:', err);
        // Don't fail the signup if messaging fails
      });

      return res.json({
        success: true,
        message: "Summit registration successful",
        role: createdUser.role,
        user: {
          _id: createdUser._id,
          username: createdUser.username,
          email: createdUser.email,
          phone: createdUser.phone,
          role: createdUser.role,
        },
      });
    } catch (error) {
      console.error("Error in summitSignup:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }
  function register(req, res) {
    var user = req.body;
    var username = user.username;
    var email = user.email;
    
    // Debug: Log received data for recruiters
    if (user.role === "Recruiter") {
      console.log('Recruiter registration data received:', {
        firstName: user.firstName,
        lastName: user.lastName,
        tagline: user.tagline,
        email: user.email,
        username: user.username
      });
    }
    
    userModel.findUserByUsername(username, email).then(async function (u) {
      if (u != null) {
        res.json({ status: false, message: "Username or email already exists" });
      } else {
        bcrypt.hash(user.password, 10, async function (err, hash) {
          if (err) {
            return res.status(500).json({ error: "Internal Server Error" });
          }
          user.password = hash;
          
          // Generate OTP
          const otp = generateOTP();
          
          // Create user with additional fields
          // For recruiters, exclude firstName and lastName as they go to RecruiterDetail
          const userDataForUser = { ...user };
          if (user.role === "Recruiter") {
            delete userDataForUser.firstName;
            delete userDataForUser.lastName;
            // tagline (roleAtCompany) also goes to RecruiterDetail as title
            delete userDataForUser.tagline;
          }
          
          const newUser = {
            ...userDataForUser,
            role: user.role,
            requestStatus: "Pending",
            accountCreatedAt: new Date(),
            otp: otp,
            otpExpiry: Date.now() + OTP_EXPIRY_TIME,
            isVerified: false,
            companyType: user.companyType,
            industry: user.industry,
            website: user.website
          };
          
          try {
            // Create user but don't set session yet
            const createdUser = await userModel.createUser(newUser);
            createdUser.password = "";

            if (createdUser.role != "Recruiter") {
              // Send OTP email
              await sendOTPEmail(createdUser.email, otp);
              // Set session for the newly created user
              req.session["user"] = createdUser;
              res.json({ 
                status: true, 
                message: "OTP sent to your email. Please verify to complete registration.",
                user: {
                  _id: createdUser._id,
                  username: createdUser.username,
                  email: createdUser.email,
                  role: createdUser.role,
                  isVerified: createdUser.isVerified
                }
              });
            } else {
              // Handle referral code if provided
              let referralData = null;
              let planToAssign = null;
              let planEndDate = null;
              let referralDuration = 30; // Default duration

              if (user.referralCode) {
                try {
                  const referral = await referralModel.findReferralByCode(user.referralCode);
                  if (referral && referral.usageCount < referral.maxUses) {
                    referralData = {
                      referralCodeUsed: user.referralCode,
                      referredBy: referral._id
                    };

                    // Apply referral offer
                    if (referral.offerType === 'freePlan') {
                      const planCode = referral.offerDetails.freePlan || 'growth';
                      planToAssign = await planModel.findPlanByCode(planCode);
                      referralDuration = referral.offerDetails.durationDays || 30;
                      
                      if (planToAssign) {
                        const now = new Date();
                        planEndDate = new Date(now);
                        planEndDate.setDate(planEndDate.getDate() + referralDuration);
                      }
                    }
                  }
                } catch (error) {
                  console.error('Error processing referral code:', error);
                  // Continue with normal registration even if referral fails
                }
              }

              // Create recruiter detail with referral and plan information
              // Extract firstName and lastName before they're deleted from user object
              // Handle undefined, null, or empty string values
              const firstName = (user.firstName && typeof user.firstName === 'string' && user.firstName.trim()) 
                ? user.firstName.trim() 
                : null;
              const lastName = (user.lastName && typeof user.lastName === 'string' && user.lastName.trim()) 
                ? user.lastName.trim() 
                : null;
              const title = (user.tagline && typeof user.tagline === 'string' && user.tagline.trim()) 
                ? user.tagline.trim() 
                : null;
              
              console.log('Creating RecruiterDetail with:', {
                firstName,
                lastName,
                title,
                company: user.username
              });
              
              const recruiterDetailData = { 
                user: createdUser._id,
                companyType: user.companyType,
                industry: user.industry,
                companyWebsite: user.website,
                company: user.username,
                // Save firstName and lastName to RecruiterDetail instead of User
                firstName: firstName,
                lastName: lastName,
                // Save roleAtCompany as title
                title: title,
                ...referralData
              };

              // If referral plan is assigned, use it; otherwise use default starter plan
              if (planToAssign) {
                recruiterDetailData.plan = planToAssign._id;
                recruiterDetailData.planStartDate = new Date();
                recruiterDetailData.planEndDate = planEndDate;
                recruiterDetailData.billingCycle = 'monthly';
                recruiterDetailData.isCustomPlan = false;
                recruiterDetailData.usageCycleStart = new Date();
                recruiterDetailData.usage = { 
                  jobPostsThisCycle: 0, 
                  aiJdThisCycle: 0, 
                  aiProfileAnalysisThisCycle: 0, 
                  jobBoostsThisCycle: 0, 
                  candidateProfileCredits: 0 
                };
              }

              await recruiterModel.createRecruiterDetail(recruiterDetailData);

              // Increment referral usage count if referral was applied
              if (referralData && referralData.referredBy) {
                await referralModel.incrementUsageCount(referralData.referredBy);
              }
              
              // Send OTP email
              await sendOTPEmail(createdUser.email, otp);
              // Set session for the newly created recruiter
              req.session["user"] = createdUser;
              
              const responseMessage = planToAssign 
                ? `OTP sent to your email. Please verify to complete registration. You've been assigned ${planToAssign.name} plan for ${referralDuration} days via referral!`
                : "OTP sent to your email. Please verify to complete registration.";
              
              res.json({ 
                status: true, 
                message: responseMessage,
                user: {
                  _id: createdUser._id,
                  username: createdUser.username,
                  email: createdUser.email,
                  role: createdUser.role,
                  isVerified: createdUser.isVerified
                },
                referralApplied: !!referralData,
                planAssigned: planToAssign ? planToAssign.name : null
              });
            }
          } catch (error) {
            console.error("Error during registration:", error);
            res.status(500).json({ error: "Internal Server Error" });
          }
        });
      }
    });
  }

  function getProfile(req, res) {
    // Auth check is already done by requireAuth middleware
    userModel
      .findUserById(req.user._id)
      .then((user) => res.json(user))
      .catch((err) => {
        console.error("Error fetching profile:", err);
        res.status(500).json({ error: "Internal Server Error" });
      });
  }
  function getRecruiterProfile(req, res) {
    // Auth check is already done by requireAuth middleware
    userModel.findRecruiterbyId(req.user._id).then((recruiter) => {
      res.json(recruiter);
    }).catch((err) => {
      console.error("Error fetching recruiter profile:", err);
      res.status(500).json({ error: "Internal Server Error" });
    });
  }
  function updateProfile(req, res) {
    var id = req.user._id;
    var newUser = req.body;
    userModel.updateUser(id, newUser).then(function (status) {
      newUser["_id"] = id;
      req.session["user"] = newUser;
      res.json({ status: 'success', data: newUser });
    }).catch((err) => {
      console.error("Error updating profile:", err);
      res.status(500).json({ status: 'error', error: "Internal Server Error" });
    });
  }
  
  function logout(req, res) {
    // Auth check is already done by requireAuth middleware
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      res.send("logged-out");
    });
  }
  function deleteUser(req, res) {
    // Admin check is already done by requireAdmin middleware
    var id = req.params["userId"];
    userModel.deleteUser(id).then(function (status) {
      res.send(status);
    }).catch((err) => {
      console.error("Error deleting user:", err);
      res.status(500).json({ error: "Internal Server Error" });
    });
  }
  function deleteProfile(req, res) {
    // Ownership check is already done by requireOwnershipOrAdmin middleware
    var id = req.user._id;
    userModel.deleteUser(id).then(function (status) {
      req.session.destroy();
      res.send(status);
    }).catch((err) => {
      console.error("Error deleting profile:", err);
      res.status(500).json({ error: "Internal Server Error" });
    });
  }
  function approveRecruiter(req, res) {
    // Admin check is already done by requireAdmin middleware
    var id = req.params["userId"];
    userModel.approveRecruiter(id).then((status) =>
      userModel.findUserById(id).then((user) => {
        sendEmailToUser(user.email, user.username);
        res.send(status);
      })
    ).catch((err) => {
      console.error("Error approving recruiter:", err);
      res.status(500).json({ error: "Internal Server Error" });
    });
  }
  function grantPremiumAccess(req, res) {
    // Admin check is already done by requireAdmin middleware
    var id = req.params["userId"];
    userModel.grantPremiumAccess(id).then(function (status) {
      res.send(status);
    }).catch((err) => {
      console.error("Error granting premium access:", err);
      res.status(500).json({ error: "Internal Server Error" });
    });
  }
  function revokePremiumAccess(req, res) {
    // Admin check is already done by requireAdmin middleware
    var id = req.params["userId"];
    userModel.revokePremiumAccess(id).then(function (status) {
      res.send(status);
    }).catch((err) => {
      console.error("Error revoking premium access:", err);
      res.status(500).json({ error: "Internal Server Error" });
    });
  }
  function sendEmailToUser(emailAddress, username) {
    const sgMail = require("@sendgrid/mail");
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: emailAddress,
      from: "JobSearchMadeEasy@enjoy.com",
      subject: "You are verified!!",
      text:
        "Hi " +
        username +
        ",\n" +
        "Welcome to Hyrnow Search Made Easy.\n" +
        "You are now a verified recruiter. Thanks for joining us. Enjoy the features of " +
        "our new application by logging in the best job search website",
    };
    return sgMail.send(msg);
  }
  function getUserProfileById(req, res) {
    var userId = req.params.userId;
    userModel
      .findUserById(userId)
      .then(function (user) {
        res.json(user);
      })
      .catch(function (error) {
        console.error("Error fetching user profile by ID:", error);
        res.status(500).json({ error: "Internal Server Error" });
      });
  }
  const fetch = require("node-fetch");
  async function getUserDetails(req, res) {
    try {
      const userId = req.params.userId; // Profile being viewed
      const viewerId = req.session["user"]._id; // ID of the user viewing the profile
      const feature = req.query.feature; // Get feature from query parameters
      let planInfo = null; // Store plan usage info

      if (!viewerId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if the profile has already been viewed within the last year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const existingView = await ProfileViewHistory.findOne({
        viewerId,
        profileId: userId,
        viewedAt: { $gte: oneYearAgo }, // Check if viewed within last year
      });

      if (!existingView && feature === "viewprofile") {
        try {
          // Check plan limits for profile viewing
          const recruiter = await recruiterDetailModel.findRecruiterDetailByUserId(viewerId);
          if (!recruiter) {
            return res.status(404).json({ error: "Recruiter profile not found" });
          }

          usage.ensureCycle(recruiter);
          let plan = null;
          if (recruiter.plan) plan = await planModel.findPlanById(recruiter.plan);
          else plan = await planModel.findPlanByCode('starter');
          if (!plan) { plan = seedPlans.find(p => p.code === 'starter'); }

          const limit = usage.parseMonthlyLimit(plan?.features?.['Candidate Database']);
          const used = recruiter.usage?.candidateProfileCredits || 0; // Using jobPostsThisCycle as profile view counter
console.log('used',used);
          console.log('[PLAN CHECK] Profile View limit', { viewerId, used, limit, feature: plan?.features?.['Candidate Database'] });

          if (used >= limit) {
            return res.status(403).json({ 
              error: 'Plan limit reached', 
              message: 'You have reached your monthly candidate database access limit. Upgrade your plan to view more profiles.' 
            });
          }

          // Increment usage
          recruiter.usage = recruiter.usage || {};
          recruiter.usage.candidateProfileCredits = used + 1;
          await recruiterDetailModel.updateRecruiterDetail(recruiter._id, { 
            usage: recruiter.usage, 
            usageCycleStart: recruiter.usageCycleStart 
          });

          planInfo = {
            remainingViews: limit - (used + 1),
            planName: plan?.name || 'Starter'
          };

          // Save the profile view history
          await ProfileViewHistory.create({
            viewerId,
            profileId: userId,
            viewedAt: new Date(),
          });
        } catch (error) {
          console.error("Credit deduction error:", error);
          return res.status(500).json({
            status: "error",
            message: "Failed to process credit deduction",
            error: error.message || "Internal server error",
          });
        }
      }

      // Fetch user details
      const user = await userModel.findUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      try {
        const [experiences, education, skill, project] = await Promise.all([
          experienceModel.findExperienceByUserId(userId),
          educationModel.findEducationByUserId(userId),
          skillsModel.findSkillByUserId(userId),
          projectsModel.findProjectByUserId(userId),
        ]);

        const response = {
          status: "success",
          data: { user, experiences, education, skill, project },
        };

        // If plan usage was tracked, include the info
        if (feature === "viewprofile" && planInfo) {
          response.planUsage = {
            remainingViews: planInfo.remainingViews,
            planName: planInfo.planName,
          };
        }

        res.json(response);
      } catch (error) {
        console.error("Error fetching user details:", error);
        res.status(500).json({
          status: "error",
          message: "Failed to fetch user details",
          error: error.message || "Internal server error",
        });
      }
    } catch (error) {
      console.error("Error in getUserDetails:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to process request",
        error: error.message || "Internal server error",
      });
    }
  }
  function getProfileCompletionScore(req, res) {
    const userId = req.params.userId;

    userModel
      .findUserById(userId)
      .then((user) => {
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Fetch the related information for the user
        Promise.all([
          experienceModel.findExperienceByUserId(userId),
          educationModel.findEducationByUserId(userId),
          skillsModel.findSkillByUserId(userId),
          projectsModel.findProjectByUserId(userId),
          resumepdf.findResumeUploadByUserId(userId),
        ])
          .then(([experiences, education, skills, projects, resume]) => {
            // Initialize score and remaining sections
            let score = 0;
            const totalSections = 5; // Number of sections considered for profile completion
            const remainingSections = [];

            // Check and assign score for each section
            // if (user.profilePicture) {
            //   score += 1;
            // } else {
            //   remainingSections.push("Profile Picture");
            // }

            if (experiences && experiences.length > 0) {
              score += 1;
            } else {
              remainingSections.push("Work Experience");
            }

            if (education && education.length > 0) {
              score += 1;
            } else {
              remainingSections.push("Education");
            }

            if (skills && skills.length > 0) {
              score += 1;
            } else {
              remainingSections.push("Skills");
            }

            if (projects && projects.length > 0) {
              score += 1;
            } else {
              remainingSections.push("Projects");
            }

            if (resume) {
              score += 1;
            } else {
              remainingSections.push("Resume");
            }

            // Calculate percentage score
            const completionPercentage = (score / totalSections) * 100;

            // Return score and remaining sections
            res.json({
              userId: user._id,
              score: completionPercentage,
              sectionsCompleted: score,
              totalSections: totalSections,
              remainingSections: remainingSections, // List of sections to complete
            });
          })
          .catch(function (error) {
            console.error("Error calculating profile completion score:", error);
            res.status(500).json({ error: "Internal Server Error" });
          });
      })
      .catch(function (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal Server Error" });
      });
  }

  app.get("/api/match-jobs/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await userModel.findUserById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const skills = await skillsModel.findSkillByUserId(userId).lean();
    const userSkills = skills.map((skill) => skill.skillName || skill.name || '').filter(Boolean);

    // Fetch ALL active job postings — no restrictive filter
    const jobPostings = await jobPostingModelServer
      .findAllJobPostings()
      .lean();

    // Filter only active jobs
    const activeJobs = jobPostings.filter(job =>
      job.status === 'Active' || job.status === 'active'
    );

    // If user has skills, try to match — otherwise return all active jobs
    let matchedJobs;
    if (userSkills.length > 0) {
      matchedJobs = activeJobs.filter((job) => {
        const coreSkills = job.coreSkills || [];
        const skillsRequired = job.skillsRequired || [];
        
        // Handle both array of strings and array of objects
        const jobSkillNames = [
          ...coreSkills.map(s => typeof s === 'string' ? s : (s.name || s.skillName || '')),
          ...skillsRequired.map(s => typeof s === 'string' ? s : (s.name || s.skillName || ''))
        ].filter(Boolean).map(s => s.toLowerCase());

        return userSkills.some(userSkill =>
          jobSkillNames.includes(userSkill.toLowerCase())
        );
      });

      // If no skill matches, return all active jobs anyway
      if (matchedJobs.length === 0) {
        matchedJobs = activeJobs;
      }
    } else {
      matchedJobs = activeJobs;
    }

    res.json({ matchedJobs });
  } catch (error) {
    console.error("Error matching jobs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

  // Purchase points
  app.post("/api/credits/purchase", async (req, res) => {
    if (!req.session || !req.session["user"]) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { amount } = req.body;
      const userId = req.session["user"]._id;
      const result = await purchasePoints(userId, amount);
      res.json({
        success: true,
        points: result.points,
        transaction: result.transactions[result.transactions.length - 1],
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  const {
    purchasePoints,
    deductPoints,
    FEATURE_COSTS,
  } = require("./credit-points.service.server");
  // Deduct points for feature usage
  app.post("/api/credits/deduct", async (req, res) => {
    if (!req.session || !req.session["user"]) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { feature } = req.body;
      const userId = req.session["user"]._id;
      const result = await deductPoints(userId, feature);
      res.json({
        success: true,
        remainingPoints: result.points,
        transaction: result.transactions[result.transactions.length - 1],
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get credit points balance
  app.get("/api/credits/balance", async (req, res) => {
    // Check authentication first
    // if (!req.session || !req.session["user"]) {
    //   return res.status(401).json({ error: "Not authenticated" });
    // }
    try {
      // Take userId from query params if present, otherwise fallback to session user
      const userId = req.query.userId || req.session["user"]._id;

      const creditPoints = await creditPointsSchema.findOne({ user: userId });

      res.json({
        points: creditPoints ? creditPoints.points : 0,
        features: FEATURE_COSTS,
      });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ error: "Error fetching balance" });
    }
  });

  // Get transaction history
  app.get("/api/credits/transactions", async (req, res) => {
    // if (!req.session || !req.session["user"]) {
    //   return res.status(401).json({ error: "Not authenticated" });
    // }

    try {
      // const userId = req.session["user"]._id;
      const userId = req.query.userId || req.session["user"]._id;
      const creditPoints = await creditPointsSchema.findOne({ user: userId });

      // Reverse the transactions array to get the latest transaction first
      const transactions = creditPoints
        ? creditPoints.transactions.reverse()
        : [];

      res.json({ transactions });
    } catch (error) {
      res.status(500).json({ error: "Error fetching transactions" });
    }
  });
  app.get(
    "/api/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
    })
  );

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/login",
      session: true,
    }),
    (req, res) => {
  req.session["user"] = req.user;
  req.session.save((err) => {
    if (err) console.error('Session save error:', err);
    const frontendUrl = process.env.FRONTEND_URL || "https://hiyrnow.in";
    const userId = req.user._id;
    const role = req.user.role || 'JobSeeker';
    // Pass userId and role as URL params — Angular reads these
    res.redirect(`${frontendUrl}/auth/google/success?userId=${userId}&role=${role}`);
  });
}
  );

  app.get("/api/current_user", (req, res) => {
    var user = req.session["user"]._id; 
    res.json(user || null);
  });
  //todo
  app.get("/api/user-activity/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const activities = await UserActivity.find({ userId }).sort({
        timestamp: -1,
      });
      return res.json(activities);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Add these routes to the existing module.exports function in the user service file

  // Add credits by admin
  app.post("/api/admin/credits/add", async (req, res) => {
    // Check if admin is logged in
    if (
      !req.session ||
      !req.session["user"] ||
      req.session["user"].role !== "Admin"
    ) {
      return res
        .status(403)
        .json({ error: "Unauthorized. Admin access required." });
    }

    try {
      const { userId, amount } = req.body;

      // Validate input
      if (!userId || !amount || amount <= 0) {
        return res
          .status(400)
          .json({ error: "Invalid user ID or credit amount" });
      }

      // Find or create credit points document for the user
      let creditPoints = await creditPointsSchema.findOne({ user: userId });

      if (!creditPoints) {
        creditPoints = new creditPointsSchema({
          user: userId,
          points: 0,
          transactions: [],
        });
      }

      // Add credits
      const previousBalance = creditPoints.points;
      creditPoints.points += amount;

      // Create transaction record
      const transaction = {
        type: "CREDIT",
        amount: amount * 5,
        points: amount,
        timestamp: new Date(),
        description: "credited By Admin",
        previousBalance: previousBalance,
        newBalance: creditPoints.points,
        adminId: req.session["user"]._id,
      };

      creditPoints.transactions.push(transaction);

      // Save the updated credit points
      await creditPoints.save();

      res.json({
        success: true,
        message: "Credits added successfully",
        newBalance: creditPoints.points,
        transaction: transaction,
      });
    } catch (error) {
      console.error("Error adding credits by admin:", error);
      res
        .status(500)
        .json({ error: "Failed to add credits", details: error.message });
    }
  });

  // Remove credits by admin
  app.post("/api/admin/credits/remove", async (req, res) => {
    // Check if admin is logged in
    if (
      !req.session ||
      !req.session["user"] ||
      req.session["user"].role !== "Admin"
    ) {
      return res
        .status(403)
        .json({ error: "Unauthorized. Admin access required." });
    }

    try {
      const { userId, amount } = req.body;

      // Validate input
      if (!userId || !amount || amount <= 0) {
        return res
          .status(400)
          .json({ error: "Invalid user ID or credit amount" });
      }

      // Find credit points document for the user
      const creditPoints = await creditPointsSchema.findOne({ user: userId });

      if (!creditPoints) {
        return res.status(404).json({ error: "User credit record not found" });
      }

      // Check if user has sufficient credits
      if (creditPoints.points < amount) {
        return res.status(400).json({
          error: "Insufficient credits",
          currentBalance: creditPoints.points,
        });
      }

      // Remove credits
      const previousBalance = creditPoints.points;
      creditPoints.points -= amount;

      // Create transaction record
      const transaction = {
        type: "admin_credit_removal",
        amount: amount,
        timestamp: new Date(),
        previousBalance: previousBalance,
        newBalance: creditPoints.points,
        adminId: req.session["user"]._id,
      };

      creditPoints.transactions.push(transaction);

      // Save the updated credit points
      await creditPoints.save();

      res.json({
        success: true,
        message: "Credits removed successfully",
        newBalance: creditPoints.points,
        transaction: transaction,
      });
    } catch (error) {
      console.error("Error removing credits by admin:", error);
      res
        .status(500)
        .json({ error: "Failed to remove credits", details: error.message });
    }
  });

  // Route to request password reset
  app.post("/api/request-password-reset", validateBody(requestPasswordResetSchema), async (req, res) => {
    const { email } = req.body;
    try {
      const user = await userModel.findUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Generate a reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry

      // Update user with reset token and expiry
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetTokenExpiry;
      await user.save();

      // Send email with reset link
      const resetLink = `https://hiyrnow.in/reset-password/${resetToken}`;
      await sendResetEmail(
        user.email,
        "Password Reset Request",
        `Click here to reset your password: ${resetLink}`
      );

      res.json({ message: "Password reset link sent to your email" });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  var mongoose = require("mongoose");
  var users = mongoose.model("users", userSchema);
  // Route to reset password
  app.post("/api/reset-password", validateBody(resetPasswordSchema), async (req, res) => {
    const { token, newPassword } = req.body;
    try {
      const user = await users.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password and clear reset token
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Add new route for OTP verification
  app.post("/api/verify-otp", validateBody(otpVerificationSchema), async (req, res) => {
    const { email, otp } = req.body;
    try {
      const user = await userModel.findUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.otp || !user.otpExpiry) {
        return res.status(400).json({ error: "No OTP found" });
      }

      if (user.otp !== otp) {
        return res.status(400).json({ error: "Invalid OTP" });
      }

      if (Date.now() > user.otpExpiry) {
        return res.status(400).json({ error: "OTP has expired" });
      }

      // Clear OTP after successful verification
      user.otp = undefined;
      user.otpExpiry = undefined;
      user.isVerified = true;
      await user.save();
      req.session["user"] = user;

      res.json({ message: "OTP verified successfully" });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Add new route for sending OTP (for company email verification before registration)
  // AFTER:
  app.post("/api/send-otp", validateBody(resendOtpSchema), async (req, res) => {
    const { email } = req.body;
    try {
      const otp = generateOTP();

      // Store OTP in DB against the email — session-independent
      // Use a temporary in-memory store with expiry
      if (!global.otpStore) {
        global.otpStore = {};
      }
      global.otpStore[email] = {
        otp: otp,
        expiry: Date.now() + OTP_EXPIRY_TIME
      };

      await sendOTPEmail(email, otp);
      res.json({ 
        success: true,
        message: "OTP sent successfully",
        expiresIn: 300
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
});

  // Add new route for verifying OTP (for company email verification before registration)
  // AFTER:
app.post("/api/verify-company-email-otp", validateBody(otpVerificationSchema), async (req, res) => {
  const { email, otp } = req.body;
  try {
    if (!global.otpStore || !global.otpStore[email]) {
      return res.status(400).json({ error: "No OTP found for this email. Please request a new one." });
    }

    const storedOtp = global.otpStore[email];

    if (Date.now() > storedOtp.expiry) {
      delete global.otpStore[email];
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    if (storedOtp.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // OTP is valid — clean up
    delete global.otpStore[email];

    res.json({ 
      success: true,
      message: "Email verified successfully" 
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

  // Add new route for resending OTP
  app.post("/api/resend-otp", validateBody(resendOtpSchema), async (req, res) => {
    const { email } = req.body;
    try {
      const user = await userModel.findUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const otp = generateOTP();
      user.otp = otp;
      user.otpExpiry = Date.now() + OTP_EXPIRY_TIME;
      await user.save();

      await sendOTPEmail(email, otp);
      res.json({ message: "OTP resent successfully" });
    } catch (error) {
      console.error("Error resending OTP:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
};
