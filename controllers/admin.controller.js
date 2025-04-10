import { db } from "../services/firebase.js";

// 📋 Show unvalidated users
export const getUnvalidatedUsers = async (req, res) => {
    try {
        const snapshot = await db.collection("users").where("isValidated", "==", false).get();
        const pendingUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.render("admin-dashboard", {
            pendingUsers,
            user: req.session.user,
            currentRoute: "admin-dashboard"
        });
    } catch (error) {
        console.error("❌ Error fetching unvalidated users:", error.message);
        res.status(500).send("Error loading admin dashboard.");
    }
};

// ✅ Approve user
export const approveUser = async (req, res) => {
    const { userId } = req.params;
    try {
        await db.collection("users").doc(userId).update({ isValidated: true });
        console.log(`✅ User ${userId} approved.`);
        res.redirect("/admin-dashboard");
    } catch (error) {
        console.error("❌ Error approving user:", error.message);
        res.status(500).send("Error approving user.");
    }
};

// ❌ Reject user
export const rejectUser = async (req, res) => {
    const { userId } = req.params;
    try {
        await db.collection("users").doc(userId).delete();
        console.log(`🗑️ User ${userId} rejected and removed.`);
        res.redirect("/admin-dashboard");
    } catch (error) {
        console.error("❌ Error rejecting user:", error.message);
        res.status(500).send("Error rejecting user.");
    }
};

// 🧾 Show All Users (including approved)
export const getAllUsers = async (req, res) => {
    try {
        const snapshot = await db.collection("users").get();
        const allUsers = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.render("admin-users", {
            allUsers,
            user: req.session.user,
            currentRoute: "admin-users"
        });
    } catch (error) {
        console.error("❌ Error fetching all users:", error.message);
        res.status(500).send("Error loading user list.");
    }
};

// 🛑 Block or Unblock user
export const toggleUserBlock = async (req, res) => {
    const { userId } = req.params;
    const { block } = req.query; // block=true or block=false

    try {
        await db.collection("users").doc(userId).update({ isBlocked: block === "true" });
        console.log(`${block === "true" ? "⛔ User blocked" : "✅ User unblocked"}: ${userId}`);
        res.redirect("/admin-users");
    } catch (error) {
        console.error("❌ Error updating block status:", error.message);
        res.status(500).send("Error updating block status.");
    }
};
