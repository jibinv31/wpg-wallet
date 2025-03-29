// routes/bank.routes.js
import express from "express";
import { db } from "../services/firebase.js";

const router = express.Router();

router.get("/banks", async (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect("/login");

  try {
    // ✅ Only get Plaid-linked banks from Firestore
    const snap = await db
      .collection("linked_banks")
      .where("userId", "==", user.uid)
      .get();

    const accounts = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        bankName: data.bankName || data.institution,
        accountNumber: data.accountNumber || "Plaid Linked",
        accountType: data.accountType || "External",
        balance: data.balance ?? 0,
        createdAt: data.createdAt || data.linkedAt,
      };
    });

    res.render("banks", {
      user,
      accounts,
      currentRoute: "banks"
    });
  } catch (error) {
    console.error("🔥 Error loading linked banks:", error.message);
    res.status(500).send("Failed to load bank accounts.");
  }
});

export default router;
