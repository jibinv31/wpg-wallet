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
    subject: 'WPG Wallet – Transfer Successful',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 1.5rem; background-color: #f9f9f9; border-radius: 8px;">

        <h2 style="color: #2563eb;">Transfer Confirmation</h2>
        <p>Hello,</p>
        <p>You’ve successfully transferred <strong>$${amount.toFixed(2)}</strong> to <strong>${recipientEmail}</strong> (Account ending in ****${last4}).</p>
        
        <p>You can view this transaction in your dashboard by clicking below:</p>
        <div style="text-align: center; margin: 1rem 0;">
          <a href="https://wpg-wallet-app.onrender.com/" style="background-color: #2563eb; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">View Transaction</a>
        </div>

        <hr style="margin: 2rem 0;">
        <p style="font-size: 0.9rem; color: #555;">If you didn’t make this transfer, please contact us immediately.</p>
        <p style="font-size: 0.9rem; color: #999;">WPG Wallet | support@wpg-wallet.app</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};


// 💰 Transaction Email to Recipient
export const sendTransferNotificationToRecipient = async (toEmail, amount, senderEmail, last4) => {
  const mailOptions = {
    from: '"WPG Wallet" <your_email@gmail.com>',
    to: toEmail,
    subject: 'You’ve Received Money!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 1.5rem; background-color: #f9f9f9; border-radius: 8px;">

        <h2 style="color: #16a34a;">You've Received Money!</h2>
        <p>Hello,</p>
        <p><strong>${senderEmail}</strong> sent you <strong>$${amount.toFixed(2)}</strong> into your account ending in ****${last4}.</p>

        <p>Log in to WPG Wallet to check your balance:</p>
        <div style="text-align: center; margin: 1rem 0;">
          <a href="https://wpg-wallet-app.onrender.com/" style="background-color: #16a34a; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">Log In Now</a>
        </div>

        <hr style="margin: 2rem 0;">
        <p style="font-size: 0.9rem; color: #555;">Don’t recognize this transfer? Contact us immediately.</p>
        <p style="font-size: 0.9rem; color: #999;">WPG Wallet | support@wpg-wallet.app</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

