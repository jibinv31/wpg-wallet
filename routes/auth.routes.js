import express from "express";
import multer from "multer";
import os from "os";
import {
    sessionLogin,
    logout,
    handleSignup
} from "../controllers/auth.controller.js";
import { renderDashboard } from "../controllers/dashboard.controller.js"; // ✅ Imported here

import { sendOTPEmail, verifyOTPCode } from "../utils/otp.js";
import { getUserByEmail } from "../models/user.model.js";


const router = express.Router();

// ✅ Multer setup (temporary file storage)
const upload = multer({ dest: os.tmpdir() });

// 🧠 Session check middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    next();
};

// 🧾 Auth pages
router.get("/signup", (req, res) => {
    console.log("🧾 GET /signup page rendered");
    res.render("signup");
});

router.get("/login", (req, res) => {
    console.log("🧾 GET /login page rendered");
    res.render("login");
});

// 🔐 Auth APIs
router.post("/signup", upload.single("kycDocument"), handleSignup);
router.post("/sessionLogin", sessionLogin);
router.get("/logout", logout);

// ✅ Protected Dashboard (use controller)
router.get("/dashboard", requireAuth, renderDashboard); // ✅ Fixed here

//adding for MFA


// router.post("/send-otp", async (req, res) => {
//     const { email } = req.body;
  
//     try {
//       await sendOTPEmail(email); // ✅ now saves to Firestore
//       res.json({ success: true, message: "OTP sent successfully" });
//     } catch (err) {
//       console.error("Error sending OTP:", err.message);
//       res.status(500).json({ success: false, message: "Failed to send OTP" });
//     }
//   });

router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not registered." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    req.session.otp = otp;
    req.session.otpEmail = email;

    await sendOTPEmail(email, otp);
    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("❌ Error verifying credentials or sending OTP:", err.message);
    return res.status(401).json({
      success: false,
      message: "Oops! Please check your email and password and try again.",
    });
  }
});
  

  // GET: Show OTP entry page
  router.get("/verify-otp", (req, res) => {
    if (!req.session.otp || !req.session.tempUser) return res.redirect("/login");
    res.render("verify-otp", { error: null });
  });
  
// ✅ POST: Verify OTP and create session
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
  
    res.render("verify-otp", { error: "Invalid OTP" });
  });
  

export default router;
