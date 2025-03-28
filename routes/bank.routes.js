import express from "express";
import { addAccount, getAccountsByUser } from "../models/account.model.js";

const router = express.Router();

// GET Add Bank Page
router.get("/add-bank", async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect("/login");

    const accounts = await getAccountsByUser(user.uid);

    res.render("add-bank", {
      user,
      accounts,
      currentRoute: "add-bank" // For nav highlighting
    });
  } catch (error) {
    console.error("Error loading Add Bank page:", error.message);
    res.status(500).send("Failed to load Add Bank page.");
  }
});

// POST Add Bank Submission
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
