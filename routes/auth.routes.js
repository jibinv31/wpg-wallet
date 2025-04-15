import express from "express";
import multer from "multer";
import os from "os";
import csrf from "csurf";
import { admin, db } from "../services/firebase.js";
import {
  sessionLogin,
  logout,
  handleSignup
} from "../controllers/auth.controller.js";
import {
  renderCompleteProfilePage,
  handleCompleteProfile
} from "../controllers/completeProfile.controller.js";
import { renderDashboard, renderProfile } from "../controllers/dashboard.controller.js";
import { getUserByEmail } from "../models/user.model.js";
import { sendOTPviaEmail } from "../utils/otp.js";

const router = express.Router();
const upload = multer({ dest: os.tmpdir() });
const csrfProtection = csrf({ cookie: false });

const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.redirect("/login");
  next();
};

// ✅ Signup page - CSRF removed
router.get("/signup", (req, res) => {
  const successMessage = req.session.successMessage || null;
  const errorMessage = req.session.errorMessage || null;
  delete req.session.successMessage;
  delete req.session.errorMessage;

  return res.render("signup", {
    successMessage,
    errorMessage,
    csrfToken: null
  });
});

// ✅ Signup POST - CSRF removed
router.post("/signup", upload.single("kycDocument"), handleSignup);

// 🔐 Login page
router.get("/login", csrfProtection, (req, res) => {
  return res.render("login", { csrfToken: req.csrfToken() });
});

// 🔐 Forgot password
router.get("/forgot-password", csrfProtection, (req, res) => {
  return res.render("forgot-password", { csrfToken: req.csrfToken() });
});

// 🔐 Google Profile Completion
router.get("/complete-profile", csrfProtection, (req, res) => {
  if (!req.session.tempGoogleUser) return res.redirect("/login");
  return renderCompleteProfilePage(req, res);
});

// ✅ Complete profile POST - CSRF removed
router.post("/complete-profile", upload.single("kycDocument"), handleCompleteProfile);

// ✅ Google token verification - CSRF removed
router.post("/google-complete-profile", async (req, res) => {
  const { idToken, name } = req.body;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    const userSnap = await db.collection("users").doc(uid).get();
    if (userSnap.exists) {
      return res.status(409).json({ error: "User already registered. Please login instead." });
    }

    req.session.tempGoogleUser = { uid, email, name };
    req.session.save(() => res.status(200).json({ redirect: "/complete-profile" }));
  } catch (error) {
    console.error("Google signup error:", error.message);
    return res.status(401).json({ error: "Invalid Google token or session error." });
  }
});

// 🔐 Firebase login + session
router.post("/sessionLogin", csrfProtection, sessionLogin);

router.get("/logout", logout);

// 🔐 OTP
router.post("/send-otp", csrfProtection, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email required" });

  try {
    let userExists = false;
    try {
      await admin.auth().getUserByEmail(email);
      userExists = true;
    } catch (_) {
      const snap = await db.collection("super_admins").where("email", "==", email).limit(1).get();
      userExists = !snap.empty;
    }

    if (!userExists) return res.status(404).json({ success: false, message: "User not found" });

    req.session.otpEmail = email;
    await sendOTPviaEmail(email);
    return res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("OTP error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

// 🔐 OTP verify
router.get("/verify-otp", csrfProtection, (req, res) => {
  if (!req.session.otp || !req.session.tempUser) return res.redirect("/login");
  return res.render("verify-otp", { error: null, csrfToken: req.csrfToken() });
});

router.post("/verify-otp", csrfProtection, (req, res) => {
  const { otp } = req.body;
  if (String(otp).trim() === String(req.session.otp).trim() && req.session.tempUser) {
    const { uid, email, name } = req.session.tempUser;
    req.session.user = { uid, email, name };
    delete req.session.tempUser;
    delete req.session.otp;
    delete req.session.otpEmail;
    return res.redirect("/dashboard");
  }

  return res.render("verify-otp", { error: "Invalid OTP", csrfToken: req.csrfToken() });
});

// 🔐 Protected pages
router.get("/dashboard", requireAuth, renderDashboard);
router.get("/profile", requireAuth, renderProfile);

export default router;
