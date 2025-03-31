// routes/bankac.routes.js
import express from "express";
import { db } from "../services/firebase.js";

const router = express.Router();

// GET /banks - Show all linked bank accounts
router.get("/banks", async (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect("/login");

  try {
    const snap = await db
      .collection("linked_banks")
      .where("userId", "==", user.uid)
      .get();

    const accounts = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id, // ✅ Include docId for removal
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

// POST /banks/remove - Remove selected bank account
router.post("/banks/remove", async (req, res) => {
  const user = req.session.user;
  const { docId } = req.body;

  if (!user || !docId) return res.redirect("/banks");

  try {
    await db.collection("linked_banks").doc(docId).delete();
    console.log(`✅ Removed bank with docId: ${docId}`);
    res.redirect("/banks");
  } catch (error) {
    console.error("❌ Failed to remove bank:", error.message);
    res.status(500).send("Error removing bank account.");
  }
});

export default router;
