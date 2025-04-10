import express from "express";
import multer from "multer";
import os from "os";
import { admin, db } from "../services/firebase.js";
import {
  sessionLogin,
  logout,
  handleSignup
} from "../controllers/auth.controller.js";
import { renderDashboard, renderProfile } from "../controllers/dashboard.controller.js";

import { sendOTPEmail } from "../utils/otp.js";
import { getUserByEmail } from "../models/user.model.js";

const router = express.Router();

// ✅ Multer setup for file uploads
const upload = multer({ dest: os.tmpdir() });

// 🧠 Auth check middleware
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
};

// 🧾 Signup Page with Toast Session Messages
router.get("/signup", (req, res) => {
  console.log("🧾 GET /signup page rendered");

  let successMessage = req.session.successMessage || null;
  let errorMessage = req.session.errorMessage || null;

  // Fallback if frontend redirects with ?error=...
  if (!successMessage && !errorMessage && req.query.error) {
    if (req.query.error === "email-already-in-use") {
      errorMessage = "Email already exists. Please login or use another email.";
    } else if (req.query.error === "signup-failed") {
      errorMessage = "Signup failed. Please try again.";
    }
  }

  delete req.session.successMessage;
  delete req.session.errorMessage;

  return res.render("signup", {
    successMessage,
    errorMessage
  });
});

// 🧾 Login Page
router.get("/login", (req, res) => {
  console.log("🧾 GET /login page rendered");
  return res.render("login");
});

// 🔐 Handle Signup (logic separated, toast feedback via session)
router.post("/signup", upload.single("kycDocument"), async (req, res) => {
  try {
    const result = await handleSignup(req); // handleSignup only returns if successful
    if (result.success) {
      req.session.successMessage = "Signup successful! Awaiting admin validation.";
    }
  } catch (error) {
    console.error("⚠️ Signup Error:", error.message);
    req.session.errorMessage = error.message || "Signup failed. Please try again.";
  }

  return res.redirect("/signup");
});

// 🔐 Login and Logout Routes
router.post("/sessionLogin", sessionLogin);
router.get("/logout", logout);

// ✅ Protected Routes
router.get("/dashboard", requireAuth, renderDashboard);
router.get("/profile", requireAuth, renderProfile);

// 🔐 MFA: OTP Send
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  try {
    let userExists = false;
    try {
      await admin.auth().getUserByEmail(email);
      userExists = true;
    } catch (_) {
      const snap = await db.collection("super_admins")
        .where("email", "==", email)
        .limit(1)
        .get();

      userExists = !snap.empty;
    }

    if (!userExists) {
      return res.status(404).json({ success: false, message: "User not found or not registered." });
    }

    await sendOTPEmail(email);
    return res.json({ success: true, message: "OTP sent successfully" });

  } catch (err) {
    console.error("Error sending OTP:", err.message);
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

// 🔐 OTP Verification Page
router.get("/verify-otp", (req, res) => {
  if (!req.session.otp || !req.session.tempUser) {
    return res.redirect("/login");
  }
  return res.render("verify-otp", { error: null });
});

// 🔐 OTP Verification Submit
router.post("/verify-otp", (req, res) => {
  const { otp } = req.body;

  if (otp === req.session.otp && req.session.tempUser) {
    const { uid, email, name } = req.session.tempUser;

    req.session.user = { uid, email, name };
    delete req.session.tempUser;
    delete req.session.otp;
    delete req.session.otpEmail;

    return res.redirect("/dashboard");
  }

  return res.render("verify-otp", { error: "Invalid OTP" });
});

export default router;
