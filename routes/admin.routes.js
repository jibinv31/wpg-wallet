import express from "express";
import {
    getUnvalidatedUsers,
    approveUser,
    rejectUser,
    getAllUsers,
    toggleUserBlock
} from "../controllers/admin.controller.js";
import { db } from "../services/firebase.js";

const router = express.Router();

// 🛡️ Super Admin check middleware
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

// 🔐 Admin dashboard for user approvals
router.get("/admin-dashboard", isSuperAdmin, getUnvalidatedUsers);
router.post("/admin/approve/:userId", isSuperAdmin, approveUser);
router.post("/admin/reject/:userId", isSuperAdmin, rejectUser);

// 🧾 Admin panel to view all users and manage block status
router.get("/admin-users", isSuperAdmin, getAllUsers);
router.post("/admin/block/:userId", isSuperAdmin, toggleUserBlock); // expects ?block=true/false

export default router;
