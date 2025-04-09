import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,         // your Gmail
    pass: process.env.GMAIL_APP_PASSWORD  // App Password
  }
});

export const sendOTPEmail = async (toEmail, otp) => {
    const mailOptions = {
      from: '"WPG Wallet" <your_email@gmail.com>',
      to: toEmail,
      subject: 'Your OTP for WPG Wallet Login',
      text: `Your one-time password (OTP) is: ${otp}`,
    };
  
    await transporter.sendMail(mailOptions);
  };
  
