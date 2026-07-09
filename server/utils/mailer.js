const nodemailer = require('nodemailer');

/**
 * Creates a Nodemailer transporter from environment variables.
 * Supports Gmail (EMAIL_SERVICE=gmail) or any generic SMTP host.
 *
 * Required .env variables:
 *   EMAIL_USER  — your email address (e.g. yourname@gmail.com)
 *   EMAIL_PASS  — your Gmail App Password or SMTP password
 *   EMAIL_SERVICE — (optional) 'gmail' | defaults to generic SMTP
 *   EMAIL_HOST  — (optional) SMTP host if not using Gmail
 *   EMAIL_PORT  — (optional) SMTP port, default 587
 */
const createTransporter = () => {
  if (process.env.EMAIL_SERVICE === 'gmail' || !process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Sends a password reset OTP email.
 * @param {string} toEmail  - recipient address
 * @param {string} otp      - 6-digit code
 */
const sendOtpEmail = async (toEmail, otp) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"LoanManager" <${process.env.EMAIL_USER}>`,
    to:   toEmail,
    subject: 'Your Password Reset Code — LoanManager',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #E2E8F0; border-radius: 12px;">
        <h2 style="color: #4F46E5; margin-bottom: 8px;">🔐 Password Reset</h2>
        <p style="color: #475569; margin-bottom: 24px;">Use the code below to reset your LoanManager password. It expires in <strong>15 minutes</strong>.</p>
        <div style="background: #F1F5F9; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #1E293B;">${otp}</span>
        </div>
        <p style="color: #94A3B8; font-size: 13px;">If you didn't request this, ignore this email. Your password won't change.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail };
