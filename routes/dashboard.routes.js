import express from "express";
import { getAccountsByUser } from "../models/account.model.js";

const router = express.Router();

router.get("/dashboard", async (req, res) => {
  const uid = req.session.user.uid;

  try {
    const accounts = await getAccountsByUser(uid);
    
    const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
    const accountCount = accounts.length;

    res.render("dashboard", {
      user: req.session.user,
      accounts,
      totalBalance,
      accountCount,
    });
  } catch (err) {
    console.error("Dashboard error:", err.message);
    res.status(500).send("Something went wrong.");
  }
});

export default router;
