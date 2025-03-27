import { getAccountsByUser } from "../models/account.model.js";

export const showDashboard = async (req, res) => {
  try {
    const uid = req.session.user.uid;
    const accounts = await getAccountsByUser(uid);

    res.render("dashboard", {
      user: req.session.user,
      accounts,
      totalBalance,
    });
  } catch (err) {
    console.error("Dashboard error:", err.message);
    res.status(500).send("Error loading dashboard");
  }
};
