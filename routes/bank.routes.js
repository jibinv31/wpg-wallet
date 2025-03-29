import express from "express";
//import { addAccount, getAccountsByUser } from "../models/plaid.model.js";
import { getAccountsByUser } from "../models/plaid.model.js";
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



export default router;
