// controllers/dashboard.controller.js
import { getAccountsByUser } from "../models/plaid.model.js";
import { db } from "../services/firebase.js";
import { decrypt } from "../utils/encryption.js";
import { plaidClient } from "../services/plaid.js";

export const renderDashboard = async (req, res) => {
  const uid = req.session?.user?.uid;
  const user = req.session.user;
  if (!uid) return res.redirect("/login");

  try {
    const manualAccounts = await getAccountsByUser(uid);

    const plaidSnap = await db
      .collection("linked_banks")
      .where("userId", "==", uid)
      .get();

    const plaidAccounts = plaidSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const accountCount = manualAccounts.length + plaidAccounts.length;
    const totalBalance = manualAccounts.reduce(
      (sum, acc) => sum + Number(acc.balance || 0),
      0
    );

    // 🕒 Date filter: last 10 days
    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(now.getDate() - 10);

    // 🔹 Fetch manual transactions
    const manualSnap = await db
      .collection("transfers")
      .where("userId", "==", uid)
      .get();

    const manualTransactions = manualSnap.docs
      .map(doc => doc.data())
      .filter(t => new Date(t.createdAt) >= tenDaysAgo)
      .map(t => ({
        date: t.createdAt,
        name: `Transfer to ${t.recipientEmail}`,
        amount: -Math.abs(t.amount),
        category: ["Manual Transfer"],
        status: t.status || "success"
      }));

    // 🔹 Fetch Plaid transactions
    const plaidTransactions = [];
    for (const bank of plaidAccounts) {
      try {
        const accessToken = decrypt(bank.accessToken);
        const plaidRes = await plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: tenDaysAgo.toISOString().split("T")[0],
          end_date: now.toISOString().split("T")[0],
        });

        plaidRes.data.transactions.forEach(txn => {
          plaidTransactions.push({ ...txn, status: "posted" });
        });
      } catch (err) {
        console.warn(`⚠️ Error fetching from Plaid (${bank.institution}):`, err.message);
      }
    }

    // 🔄 Combine & sort
    const recentTransactions = [...manualTransactions, ...plaidTransactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    console.log("📥 Total recent transactions shown:", recentTransactions.length);

    // Get unread notifications count
    const notificationSnap = await db
      .collection("notifications")
      .where("userId", "==", uid)
      .where("read", "==", false)
      .get();
    const notificationCount = notificationSnap.size;
    console.log("📬 Notification Count:", notificationCount);

    // Mark them as read (you can do this in a batch update)
    const batch = db.batch();
    notificationSnap.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });
    await batch.commit();

    res.render("dashboard", {
      user,
      accounts: plaidAccounts,
      totalBalance,
      accountCount,
      recentTransactions,
      notificationCount,
      currentRoute: "dashboard"
    });

  } catch (error) {
    console.error("❌ Dashboard error:", error.message);
    res.status(500).send("Something went wrong.");
  }
};
