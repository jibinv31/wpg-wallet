import express from "express";
import multer from "multer";
import os from "os";
import {
    sessionLogin,
    logout,
    handleSignup
} from "../controllers/auth.controller.js";
import { renderDashboard } from "../controllers/dashboard.controller.js"; // ✅ Imported here

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

export default router;
