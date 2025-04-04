import { getAccountsByUser } from "../models/plaid.model.js";
import { db } from "../services/firebase.js";

export const renderDashboard = async (req, res) => {
  const uid = req.session?.user?.uid;
  const user = req.session.user;

  if (!uid) return res.redirect("/login");

  try {
    // Manual accounts
    const manualAccounts = await getAccountsByUser(uid);

    // Plaid-linked accounts
    const plaidSnap = await db
      .collection("linked_banks")
      .where("userId", "==", uid)
      .get();

    const plaidAccounts = plaidSnap.docs.map(doc => doc.data());

    const accountCount = manualAccounts.length + plaidAccounts.length;
    const totalBalance = manualAccounts.reduce(
      (sum, acc) => sum + Number(acc.balance || 0),
      0
    );

    // 🕒 Get ALL transactions and manually filter last 7 days
    const allTxnSnap = await db
      .collection("transactions")
      .where("userId", "==", uid)
      .orderBy("date", "desc")
      .limit(50)
      .get();

    const allTxns = allTxnSnap.docs.map(doc => doc.data());
    console.log("📦 ALL Firestore transactions:", allTxns.length);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentTransactions = allTxns
      .filter(txn => {
        const txnDate = new Date(txn.date);
        return txnDate >= sevenDaysAgo;
      })
      .slice(0, 5); // Show max 5

    console.log("📥 Recent transactions found:", recentTransactions.length);

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
