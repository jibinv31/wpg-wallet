import nodemailer from "nodemailer";
import { db } from "../services/firebase.js";

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const sendOTPviaEmail = async (email) => {
  if (!email || typeof email !== "string") throw new Error("Invalid email");

  const otp = generateOTP();

  // Store in Firestore (or just in session if you prefer)
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

  await transporter.sendMail({
    from: `WPG-Wallet <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Your OTP Code",
    html: `<p>Your OTP is <strong>${otp}</strong>. It is valid for 5 minutes.</p>`,
  });

  console.log(`📧 OTP sent to ${email}: ${otp}`);
};

export const verifyOTPCode = async (email, enteredOtp) => {
  const doc = await db.collection("otp_codes").doc(email).get();
  if (!doc.exists) return false;

  const { otp, createdAt } = doc.data();
  const now = new Date();
  const created = new Date(createdAt);
  const diffMinutes = (now - created) / 1000 / 60;

  if (diffMinutes > 5) return false;
  if (otp !== enteredOtp) return false;

  await db.collection("otp_codes").doc(email).delete(); // one-time use
  return true;
};
