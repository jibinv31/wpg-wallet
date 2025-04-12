import express from "express";
import multer from "multer";
import os from "os";
import { admin, db } from "../services/firebase.js";
import {
  sessionLogin,
  logout,
  handleSignup,
} from "../controllers/auth.controller.js";

import {
  renderCompleteProfilePage,
  handleCompleteProfile,
} from "../controllers/completeProfile.controller.js";

import { renderDashboard, renderProfile } from "../controllers/dashboard.controller.js";
import { sendOTPEmail } from "../utils/otp.js";
import { getUserByEmail } from "../models/user.model.js";

const router = express.Router();
const upload = multer({ dest: os.tmpdir() });

// 🧠 Auth check middleware
const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.redirect("/login");
  next();
};

// 🧾 Signup Page
router.get("/signup", (req, res) => {
  console.log("🧾 GET /signup page rendered");

  let successMessage = req.session.successMessage || null;
  let errorMessage = req.session.errorMessage || null;

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
    errorMessage,
  });
});

// 🧾 Login Page
router.get("/login", (req, res) => {
  console.log("🧾 GET /login page rendered");
  return res.render("login");
});

// ✅ Forgot Password Page
router.get("/forgot-password", (req, res) => {
  console.log("🔁 GET /forgot-password page rendered");
  return res.render("forgot-password");
});

// 🔐 Signup (Manual)
router.post("/signup", upload.single("kycDocument"), async (req, res) => {
  try {
    const result = await handleSignup(req);
    if (result.success) {
      req.session.successMessage = "Signup successful! Awaiting admin validation.";
    }
  } catch (error) {
    console.error("⚠️ Signup Error:", error.message);
    req.session.errorMessage = error.message || "Signup failed. Please try again.";
  }

  return res.redirect("/signup");
});

// ✅ Google OAuth Profile Completion Page
router.get("/complete-profile", (req, res) => {
  if (!req.session.tempGoogleUser) return res.redirect("/login");
  return renderCompleteProfilePage(req, res);
});

router.post("/complete-profile", upload.single("kycDocument"), handleCompleteProfile);

// 🔐 Google Sign-Up Initial Step
router.post("/google-complete-profile", async (req, res) => {
  const { idToken, name } = req.body;

  console.log("📩 Google signup POST hit");
  console.log("Received body:", req.body);
  console.log("Session (before setting):", req.session);

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    console.log("✅ Firebase token verified");
    console.log("User Info:", { uid, email, name });

    const userSnap = await db.collection("users").doc(uid).get();
    if (userSnap.exists) {
      console.log("⚠️ User already exists in Firestore");
      return res.status(409).json({
        error: "User already registered. Please login instead.",
      });
    }

    req.session.tempGoogleUser = { uid, email, name };
    console.log("✅ tempGoogleUser session set:", req.session.tempGoogleUser);

    req.session.save(() => {
      console.log("✅ Session saved. Redirecting...");
      return res.status(200).json({ redirect: "/complete-profile" });
    });

  } catch (error) {
    console.error("❌ Google sign-up error:", error.message);
    return res.status(401).json({ error: "Invalid Google token or session error." });
  }
});

// 🔐 Login & Logout
router.post("/sessionLogin", sessionLogin);
router.get("/logout", logout);

// ✅ Protected Routes
router.get("/dashboard", requireAuth, renderDashboard);
router.get("/profile", requireAuth, renderProfile);

// 🔐 MFA: Send OTP
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
      return res.status(404).json({
        success: false,
        message: "User not found or not registered.",
      });
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
  if (!req.session.otp || !req.session.tempUser) return res.redirect("/login");
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
