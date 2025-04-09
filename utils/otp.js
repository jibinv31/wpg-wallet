// utils/otp.js
import nodemailer from "nodemailer";
import { db } from "../services/firebase.js";
import crypto from "crypto";

// ✅ Generate a random 6-digit code
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ✅ Send OTP Email
export const sendOTPEmail = async (email) => {
  const otp = generateOTP();

  // Save to Firestore with timestamp
  await db.collection("otp_codes").doc(email).set({
    otp,
    createdAt: new Date().toISOString(),
  });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: `WPG-Wallet <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Your OTP Code for WPG-Wallet",
    html: `<p>Your OTP is <strong>${otp}</strong>. It is valid for 5 minutes.</p>`
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 OTP sent to ${email}`);
};

// ✅ Verify OTP
export const verifyOTPCode = async (email, code) => {
  const doc = await db.collection("otp_codes").doc(email).get();

  if (!doc.exists) return false;

  const data = doc.data();
  if (data.otp !== code) return false;

  const now = new Date();
  const createdAt = new Date(data.createdAt);
  const diffMinutes = (now - createdAt) / 1000 / 60;

  // 🔒 Only valid for 5 minutes
  if (diffMinutes > 5) return false;

  // ✅ Optional: delete OTP after use
  await db.collection("otp_codes").doc(email).delete();
  return true;
};
