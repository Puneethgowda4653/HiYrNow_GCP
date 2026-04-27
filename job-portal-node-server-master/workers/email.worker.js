/**
 * Email Worker
 * Processes email sending jobs in the background
 */

const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const { QUEUE_NAMES } = require('../queues');

// Redis connection
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Email transporter setup
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Load email templates
const emailTemplateSource = fs.readFileSync(
  path.join(__dirname, '../emailTempalate/emailTemplate.html'),
  'utf8'
);
const emailTemplate = handlebars.compile(emailTemplateSource);

const resetPasswordTemplateSource = fs.readFileSync(
  path.join(__dirname, '../emailTempalate/resetPasswordTemplate.html'),
  'utf8'
);
const resetPasswordTemplate = handlebars.compile(resetPasswordTemplateSource);

/**
 * Email type handlers
 */
const emailHandlers = {
  otp: async (data) => {
    const { to, otp } = data;
    return {
      from: process.env.EMAIL_USER,
      to,
      subject: 'Your OTP for Registration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your OTP for Registration</h2>
          <p>Your OTP code is: <strong style="font-size: 24px;">${otp}</strong></p>
          <p>This OTP will expire in 5 minutes.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this OTP, please ignore this email.</p>
        </div>
      `,
    };
  },

  welcome: async (data) => {
    const { to, username } = data;
    const emailContent = emailTemplate({ username });
    return {
      from: 'no-reply@hiyrnow.in',
      to,
      subject: 'Welcome to Hyrnow!',
      html: emailContent,
    };
  },

  resetPassword: async (data) => {
    const { to, resetLink, username } = data;
    const emailContent = resetPasswordTemplate({ resetLink, username });
    return {
      from: 'no-reply@hiyrnow.in',
      to,
      subject: 'Password Reset Request',
      html: emailContent,
    };
  },

  notification: async (data) => {
    const { to, subject, html } = data;
    return {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    };
  },

  recruiterApproved: async (data) => {
    const { to, username } = data;
    return {
      from: 'no-reply@hiyrnow.in',
      to,
      subject: 'You are verified!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Congratulations ${username}!</h2>
          <p>Welcome to Hyrnow Search Made Easy.</p>
          <p>You are now a verified recruiter. Thanks for joining us.</p>
          <p>Enjoy the features of our job search platform by logging in.</p>
          <a href="https://hiyrnow.in/login" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin-top: 16px;">Login Now</a>
        </div>
      `,
    };
  },

  custom: async (data) => {
    const { to, subject, html, text } = data;
    return {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: html || text,
    };
  },
};

/**
 * Process email job
 */
async function processEmailJob(job) {
  const { type, to } = job.data;
  
  console.log(`[Email] Processing job ${job.id}: type=${type}, to=${to}`);
  
  try {
    // Get email handler
    const handler = emailHandlers[type];
    if (!handler) {
      throw new Error(`Unknown email type: ${type}`);
    }

    // Prepare email options
    const mailOptions = await handler(job.data);

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log(`[Email] Job ${job.id} sent successfully: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error(`[Email] Job ${job.id} failed:`, error);
    throw error;
  }
}

// Create worker
const worker = new Worker(
  QUEUE_NAMES.EMAIL,
  processEmailJob,
  {
    connection,
    concurrency: 5, // Process 5 emails at a time
    limiter: {
      max: 20, // Max 20 emails
      duration: 60000, // per minute
    },
  }
);

// Event listeners
worker.on('completed', (job) => {
  console.log(`[Email] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Email] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[Email] Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing Email worker...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing Email worker...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

console.log(`[Email] Worker started and listening for jobs`);

module.exports = worker;

