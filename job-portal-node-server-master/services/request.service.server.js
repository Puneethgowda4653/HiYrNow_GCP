module.exports = function (app) {
    const Request = require('../models/contact-Requests/request.model.server');
    const Contact = require('../models/contact-Requests/contact.model.server');
    const nodemailer = require('nodemailer');

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// API Routes
app.post('/api/submit-request', async (req, res) => {
  try {
    const requestData = {
      ...req.body,
      tierSelected: true
    };
    
    // Save to database
    const newRequest = new Request(requestData);
    await newRequest.save();
    
    // Send email notification
    await sendEmailNotification(requestData, true);
    
    // Send confirmation email to user
    await sendConfirmationEmail(requestData);
    
    res.status(200).json({ 
      success: true, 
      message: 'Your request has been submitted successfully!' 
    });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while processing your request.' 
    });
  }
});

app.post('/api/submit-custom-request', async (req, res) => {
  try {
    const requestData = {
      ...req.body,
      tierSelected: false
    };
    
    // Save to database
    const newRequest = new Request(requestData);
    await newRequest.save();
    
    // Send email notification
    await sendEmailNotification(requestData, false);
    
    // Send confirmation email to user
    await sendConfirmationEmail(requestData);
    
    res.status(200).json({ 
      success: true, 
      message: 'Your custom quote request has been submitted successfully!' 
    });
  } catch (error) {
    console.error('Error processing custom request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while processing your custom quote request.' 
    });
  }
});

// General Contact Form Endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, email, subject, and message.'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // Save to database
    const contactData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim()
    };

    const newContact = new Contact(contactData);
    await newContact.save();

    // Send email notification to admin
    await sendContactEmailNotification(contactData);

    // Send confirmation email to user
    await sendContactConfirmationEmail(contactData);

    res.status(200).json({
      success: true,
      ok: true,
      message: 'Thank you for contacting us! We have received your message and will get back to you soon.'
    });
  } catch (error) {
    console.error('Error processing contact form:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your message. Please try again later.'
    });
  }
});

// Utility Functions
async function sendEmailNotification(data, isStandardTier) {
  const subject = isStandardTier 
    ? `New Pricing Tier Request: ${data.points} Points` 
    : `New Custom Quote Request: ${data.points}+ Points`;
  
  const htmlContent = `
    <h2>${subject}</h2>
    <p><strong>From:</strong> ${data.firstName} ${data.lastName}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Phone:</strong> ${data.phone}</p>
    <p><strong>Industry:</strong> ${data.industry}</p>
    <p><strong>Position:</strong> ${data.position}</p>
    <p><strong>Points Requested:</strong> ${data.points}</p>
    ${data.requirements ? `<p><strong>Additional Requirements:</strong> ${data.requirements}</p>` : ''}
    <p><em>Submitted on: ${new Date().toLocaleString()}</em></p>
  `;
  
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.ADMIN_EMAIL,
    subject: subject,
    html: htmlContent
  });
}

async function sendConfirmationEmail(data) {
  const htmlContent = `
    <h2>Thank you for your request!</h2>
    <p>Dear ${data.firstName},</p>
    <p>We have received your request for ${data.points} points. Our team will review your submission and get back to you shortly.</p>
    <p>Here's a summary of your request:</p>
    <ul>
      <li><strong>Points:</strong> ${data.points}</li>
      <li><strong>Industry:</strong> ${data.industry}</li>
      <li><strong>Position:</strong> ${data.position}</li>
    </ul>
    ${data.requirements ? `<p><strong>Additional Requirements:</strong> ${data.requirements}</p>` : ''}
    <p>If you have any questions, please feel free to contact our support team.</p>
    <p>Best regards,<br>The Support Team</p>
  `;
  
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: data.email,
    subject: 'Your Request Has Been Received',
    html: htmlContent
  });
}

// Contact form email notification functions
async function sendContactEmailNotification(data) {
  if (!process.env.ADMIN_EMAIL) {
    console.warn('ADMIN_EMAIL not set, skipping admin notification email');
    return;
  }

  const subject = `New Contact Form Submission: ${data.subject}`;
  
  const htmlContent = `
    <h2>New Contact Form Submission</h2>
    <p><strong>From:</strong> ${data.name}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Subject:</strong> ${data.subject}</p>
    <hr>
    <p><strong>Message:</strong></p>
    <p>${data.message.replace(/\n/g, '<br>')}</p>
    <hr>
    <p><em>Submitted on: ${new Date().toLocaleString()}</em></p>
  `;
  
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: subject,
      html: htmlContent,
      replyTo: data.email
    });
  } catch (error) {
    console.error('Error sending contact notification email:', error);
    // Don't throw - we still want to save the contact even if email fails
  }
}

async function sendContactConfirmationEmail(data) {
  if (!process.env.EMAIL_FROM) {
    console.warn('EMAIL_FROM not set, skipping confirmation email');
    return;
  }

  const htmlContent = `
    <h2>Thank you for contacting HiYrNow!</h2>
    <p>Dear ${data.name},</p>
    <p>We have received your message and our team will get back to you as soon as possible.</p>
    <p>Here's a copy of your message:</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #6366f1; margin: 20px 0;">
      <p><strong>Subject:</strong> ${data.subject}</p>
      <p><strong>Message:</strong></p>
      <p>${data.message.replace(/\n/g, '<br>')}</p>
    </div>
    <p>If you have any urgent questions, please feel free to reach out to us directly.</p>
    <p>Best regards,<br>The HiYrNow Team</p>
  `;
  
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: data.email,
      subject: `Re: ${data.subject} - We've received your message`,
      html: htmlContent
    });
  } catch (error) {
    console.error('Error sending contact confirmation email:', error);
    // Don't throw - we still want to save the contact even if email fails
  }
}
   
}; 