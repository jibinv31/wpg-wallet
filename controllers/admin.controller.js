import { db } from "../services/firebase.js";

// 📋 Show all users who are not yet validated
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

// ✅ Admin approves a user
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

// ❌ Admin rejects a user (delete user from Firestore)
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
