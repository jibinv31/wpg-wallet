// controllers/analytics.controller.js
import { db } from "../services/firebase.js";

// Show spending + savings analytics page
export const renderSpendingAnalytics = async (req, res) => {
  const uid = req.session?.user?.uid;
  if (!uid) return res.redirect("/login");

  try {
    // 🔹 Fetch transfers for user
    const snap = await db
      .collection("transfers")
      .where("userId", "==", uid)
      .get();

    const transfers = snap.docs.map(doc => doc.data());


    // 🧮 Calculate spending by category (only if amount > 0)
    const categoryMap = {};
    for (const tx of transfers) {
        const amount = parseFloat(tx.amount);
        if (isNaN(amount) || amount <= 0) continue;
      
        const cat = tx.billType || "Other";
        categoryMap[cat] = (categoryMap[cat] || 0) + amount;
      }
      

    const chartData = {
      labels: Object.keys(categoryMap),
      values: Object.values(categoryMap),
    };

    // 🔁 Salary & Monthly Savings
    const salaryDoc = await db.collection("salaries").doc(uid).get();
    const currentSalary = salaryDoc.exists ? salaryDoc.data().amount : null;

    const savingsMap = {}; // { "2024-04": { spent, saved } }
    for (const tx of transfers) {
      const monthKey = tx.createdAt?.substring(0, 7);
      if (!monthKey) continue;

      savingsMap[monthKey] = savingsMap[monthKey] || { spent: 0, saved: 0 };
      savingsMap[monthKey].spent += tx.amount;
    }

    // Add savings if salary is known
    if (currentSalary) {
      Object.keys(savingsMap).forEach(month => {
        savingsMap[month].saved = currentSalary - savingsMap[month].spent;
      });
    }

    const savingsChartData = {
      labels: Object.keys(savingsMap),
      spent: Object.values(savingsMap).map(m => m.spent),
      savings: Object.values(savingsMap).map(m => m.saved || 0),
    };

    console.log("📊 Transfers fetched for analytics:", transfers);

    res.render("spending-analytics", {
      user: req.session.user,
      notificationCount: 0,
      chartData,
      savingsChartData,
      totalSpent: Object.values(categoryMap).reduce((a, b) => a + b, 0),
      salary: currentSalary,
      currentRoute: "analytics"
    });
  } catch (err) {
    console.error("❌ Analytics error:", err.message);
    res.status(500).send("Error loading analytics");
  }
};

// Save salary input
export const updateSalary = async (req, res) => {
    const uid = req.session?.user?.uid;
    if (!uid) return res.redirect("/login");
  
    const salary = parseFloat(req.body.salary);
    if (isNaN(salary) || salary < 0) return res.redirect("/analytics");
  
    try {
      await db.collection("salaries").doc(uid).set({ amount: salary }, { merge: true });
      res.redirect("/analytics");
    } catch (err) {
      console.error("❌ Salary update failed:", err.message);
      res.status(500).send("Failed to update salary");
    }
  };
