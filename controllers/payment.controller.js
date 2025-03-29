// controllers/payment.controller.js
import { db } from "../services/firebase.js";
import { plaidClient } from "../services/plaid.js";
import { decrypt } from "../utils/encryption.js";

// Render transfer page with live plaid-linked accounts
export const renderTransferPage = async (req, res) => {
  const { uid } = req.session.user;
  try {
    const linkedSnap = await db.collection("linked_banks").where("userId", "==", uid).get();
    const linkedAccounts = [];

    for (const doc of linkedSnap.docs) {
      const data = doc.data();
      const accessToken = decrypt(data.accessToken);
      const accountRes = await plaidClient.accountsGet({ access_token: accessToken });

      accountRes.data.accounts.forEach((acc) => {
        linkedAccounts.push({
          id: acc.account_id,
          name: acc.name,
          subtype: acc.subtype,
          balance: acc.balances.available ?? acc.balances.current ?? 0.0,
          institution: data.institution,
        });
      });
    }

    res.render("payment-transfer", {
      user: req.session.user,
      plaidAccounts: linkedAccounts,
    });
  } catch (err) {
    console.error("Transfer page error:", err.message);
    res.status(500).send("Something went wrong");
  }
};

// Process payment logic (you can expand this)
export const processTransfer = async (req, res) => {
  const { sourceAccountId, amount, note, recipientEmail, recipientAccountNumber } = req.body;
  console.log("✅ Transfer initiated:", { sourceAccountId, amount, recipientEmail });
  // Optional: Add logic to store transfer logs
  res.redirect("/dashboard");
};
