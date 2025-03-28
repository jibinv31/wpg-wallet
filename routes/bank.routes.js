import express from "express";
import { addAccount } from "../models/account.model.js";

const router = express.Router();

router.get("/add-bank", (req, res) => {
  res.render("add-bank", {
    user: req.session.user,
    currentRoute: "add-bank" // ✅ Used to highlight nav (optional if needed)
  });
});

router.post("/add-bank", async (req, res) => {
  const { bankName, accountNumber, accountType, balance } = req.body;
  const userId = req.session.user.uid;

  try {
    await addAccount(userId, {
      bankName,
      accountNumber,
      accountType,
      balance: parseFloat(balance),
      createdAt: new Date().toISOString(),
    });

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Add Bank Error:", err.message);
    res.status(500).send("Failed to link bank");
  }
});

export default router;
