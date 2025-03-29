// routes/payment.routes.js
import express from "express";
import { processTransfer } from "../controllers/payment.controller.js";
import { getAccountsByUser } from "../models/plaid.model.js";

const router = express.Router();

// GET transfer form
router.get("/transfer", async (req, res) => {
  const uid = req.session.user.uid;
  const accounts = await getAccountsByUser(uid);
  res.render("payment-transfer", {
    user: req.session.user,
    accounts,
    currentRoute: "transfer", // ✅ This is the fix
  });
});

// POST transfer logic
router.post("/payment-transfer", processTransfer);

export default router;
