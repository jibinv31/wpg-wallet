import express from "express";
import { sessionLogin, logout } from "../controllers/auth.controller.js";
const router = express.Router();

// 🧠 Middleware to protect routes
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    next();
};

// 🧠 Signup/Login Views
router.get("/signup", (req, res) => {
    console.log("🧾 GET /signup page rendered");
    res.render("signup");
});

router.get("/login", (req, res) => {
    console.log("🧾 GET /login page rendered");
    res.render("login");
});

// ✅ Protected Dashboard route
// router.get("/dashboard", requireAuth, (req, res) => {
//     console.log("🧾 GET /dashboard page rendered");
//     res.render("dashboard", { user: req.session.user });
// });

// 🔐 Auth routes
router.post("/sessionLogin", sessionLogin);
router.get("/logout", logout);

export default router;
