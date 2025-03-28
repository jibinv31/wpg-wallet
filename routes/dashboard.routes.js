import express from "express";
import { getAccountsByUser } from "../models/account.model.js";
import { db } from "../services/firebase.js"; // 👈 Required for linked_banks

const router = express.Router();

router.get("/dashboard", async (req, res) => {
  const uid = req.session.user.uid;

  try {
    // 🧾 Fetch manually added accounts
    const manualAccounts = await getAccountsByUser(uid);

    // 🔗 Fetch Plaid-linked accounts
    const plaidSnap = await db
      .collection("linked_banks")
      .where("userId", "==", uid)
      .get();

    const plaidAccounts = plaidSnap.docs.map(doc => doc.data());

    // 🧮 Account count = manual + plaid
    const accountCount = manualAccounts.length + plaidAccounts.length;

    // 💰 Total balance (only from manual accounts)
    const totalBalance = manualAccounts.reduce(
      (sum, acc) => sum + Number(acc.balance || 0),
      0
    );

    res.render("dashboard", {
      user: req.session.user,
      accounts: manualAccounts, // Used for rendering recent transactions
      totalBalance,
      accountCount,
      currentRoute: "home"
    });
  } catch (err) {
    console.error("Dashboard error:", err.message);
    res.status(500).send("Something went wrong.");
  }
});

export default router;
