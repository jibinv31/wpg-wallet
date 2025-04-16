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
  
  // 💸 Transaction Email to Sender
export const sendTransferConfirmationToSender = async (toEmail, amount, recipientEmail, last4) => {
  const mailOptions = {
    from: '"WPG Wallet" <your_email@gmail.com>',
    to: toEmail,
    subject: 'Transfer Successful',
    text: `Hi, your transfer of $${amount.toFixed(2)} to ${recipientEmail} (account ending in ${last4}) was successful.`
  };

  await transporter.sendMail(mailOptions);
};

// 💰 Transaction Email to Recipient
export const sendTransferNotificationToRecipient = async (toEmail, amount, senderEmail, last4) => {
  const mailOptions = {
    from: '"WPG Wallet" <your_email@gmail.com>',
    to: toEmail,
    subject: 'You Received Money!',
    text: `Hi, you've received $${amount.toFixed(2)} from ${senderEmail} into account ending in ${last4}.`
  };

  await transporter.sendMail(mailOptions);
};
