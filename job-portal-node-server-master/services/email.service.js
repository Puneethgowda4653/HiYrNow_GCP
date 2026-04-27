const nodemailer = require('nodemailer');
const fs = require('fs');
const handlebars = require('handlebars');
// Configure the transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const path = require('path');
// const emailTemplateSource = fs.readFileSync(path.join(__dirname, './../emailTemplate/emailTemplate.html'), 'utf8');
const emailTemplateSource = fs.readFileSync(path.join(__dirname, '../emailTempalate/emailTemplate.html'), 'utf8');
// './../models/user/user.model.server' './../models/user/user.model.server'
// const emailTemplateSource = fs.readFileSync('./../emailTempalate/emailTemplate.html', 'utf8');
const template = handlebars.compile(emailTemplateSource);
// Load the reset password email template
const resetPasswordTemplateSource = fs.readFileSync(path.join(__dirname, '../emailTempalate/resetPasswordTemplate.html'), 'utf8');
const resetPasswordTemplate = handlebars.compile(resetPasswordTemplateSource);
// Send email function


function sendEmail(to, subject, text,username) {

    const emailContent = template({ username });
    const mailOptions = {
        from: 'no-reply@hiyrnow.in', // Sender address
        to: to,                       // List of recipients
        subject: subject,             // Subject line
        // text: text   
        html: emailContent                 // Plain text body
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log('Error sending email: ', error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

function sendResetEmail(to, subject, resetLink, username) {
    const emailContent = resetPasswordTemplate({ 
        username, 
        resetLink
    });

    const mailOptions = {
        from: 'no-reply@hiyrnow.in',
        to: to,
        subject: subject,
        html: emailContent
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log('Error sending email: ', error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

module.exports = { sendEmail,sendResetEmail };
