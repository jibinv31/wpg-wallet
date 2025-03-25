import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
    res.send("Welcome to the WPG Wallet dashboard! 🔐");
});

export default router;
