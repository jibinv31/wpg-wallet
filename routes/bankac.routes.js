// routes/bankac.routes.js
import express from "express";
import { getAccountsByUser } from "../models/account.model.js";
import { db } from "../services/firebase.js"; // 👈 for linked_banks

const router = express.Router();

// Route to display all linked banks
router.get("/banks", async (req, res) => {
    const user = req.session.user;

    if (!user) return res.redirect("/login");

    try {
        const manualAccounts = await getAccountsByUser(user.uid);

        // 🔄 Fetch Plaid linked banks
        const plaidSnap = await db
            .collection("linked_banks")
            .where("userId", "==", user.uid)
            .get();

        const plaidAccounts = plaidSnap.docs.map((doc) => {
            const data = doc.data();
            return {
                bankName: data.institution,
                accountNumber: "Plaid Linked",
                accountType: "External",
                balance: 0,
                createdAt: data.linkedAt,
            };
        });

        const allAccounts = [...manualAccounts, ...plaidAccounts];

        res.render("banks", {
            user,
            accounts: allAccounts,
            currentRoute: "banks" // ✅ Highlight correct nav item
        });
    } catch (error) {
        console.error("Error fetching bank accounts:", error.message);
        res.status(500).send("Failed to load bank accounts.");
    }
});

export default router;
