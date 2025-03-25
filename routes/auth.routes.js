import express from "express";
import { sessionLogin, logout } from "../controllers/auth.controller.js";
const router = express.Router();

// 🧠 Signup/Login Views
router.get("/signup", (req, res) => {
    console.log("🧾 GET /signup page rendered");
    res.render("signup");
});

router.get("/login", (req, res) => {
    console.log("🧾 GET /login page rendered");
    res.render("login");
});

// 🔐 Auth routes
router.post("/sessionLogin", sessionLogin);
router.get("/logout", logout);

export default router;
