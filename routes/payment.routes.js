import express from "express";
import { processTransfer } from "../controllers/payment.controller.js";
import { db } from "../services/firebase.js";

const router = express.Router();

router.get("/transfer", async (req, res) => {
  const { uid } = req.session.user;

  try {
    const snap = await db.collection("linked_banks")
      .where("userId", "==", uid)
      .get();

    const accounts = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.render("payment-transfer", {
      user: req.session.user,
      accounts,
      currentRoute: "transfer"
    });
  } catch (err) {
    console.error("❌ Error fetching accounts for transfer:", err.message);
    res.status(500).send("Failed to load payment transfer page.");
  }
});

router.post("/payment-transfer", processTransfer);

export default router;
