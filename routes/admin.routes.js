import express from "express";
import { getUnvalidatedUsers, approveUser, rejectUser } from "../controllers/admin.controller.js";
import { db } from "../services/firebase.js";

const router = express.Router();

// 🛡️ Middleware to check super admin
const isSuperAdmin = async (req, res, next) => {
    const uid = req.session?.user?.uid;
    if (!uid) return res.redirect("/login");

    try {
        const snap = await db.collection("super_admins").doc(uid).get();
        if (!snap.exists) {
            return res.status(403).send("Access denied – Not a super admin.");
        }
        next();
    } catch (err) {
        console.error("❌ Admin check failed:", err.message);
        res.status(500).send("Server error");
    }
};

// 🔐 Admin dashboard and actions
router.get("/admin-dashboard", isSuperAdmin, getUnvalidatedUsers);
router.post("/admin/validate/:userId", isSuperAdmin, approveUser);
router.post("/admin/reject/:userId", isSuperAdmin, rejectUser); // 🚫 reject route added

export default router;
