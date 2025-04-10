import { db } from "../services/firebase.js";

export const renderSpendingAnalytics = async (req, res) => {
  const uid = req.session?.user?.uid;
  const user = req.session.user;
  if (!uid) return res.redirect("/login");

  try {
    const snap = await db.collection("transfers")
      .where("userId", "==", uid)
      .get();

    const transfers = snap.docs.map(doc => doc.data());

    // 🧠 Filter only bill payments and transfers that are expenses
    const spending = transfers.filter(txn => 
      txn.transferType === "bill" || txn.transferType === "transfer"
    );

    const categoryTotals = {};

    for (const txn of spending) {
      const category = txn.billType || "Transfers";
      const amount = parseFloat(txn.amount || 0);

      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }

      categoryTotals[category] += amount;
    }

    const chartData = {
      labels: Object.keys(categoryTotals),
      values: Object.values(categoryTotals)
    };

    const totalSpent = chartData.values.reduce((sum, val) => sum + val, 0);

    res.render("spending-analytics", {
      user,
      notificationCount: 0, // ✅ add dynamic if needed
      chartData,
      totalSpent
    });

  } catch (err) {
    console.error("❌ Analytics Error:", err.message);
    res.status(500).send("Failed to load analytics.");
  }
};
