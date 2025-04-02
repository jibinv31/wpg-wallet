// routes/notifications.routes.js
import express from "express";
import { db } from "../services/firebase.js";

const router = express.Router();

router.get("/notifications", async (req, res) => {
    const user = req.session.user;
    if (!user) return res.redirect("/login");
  
    try {
      const snap = await db
        .collection("notifications")
        .where("userId", "==", user.uid)
        .orderBy("createdAt", "desc")
        .get();
  
      const notifications = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
  
      console.log("📬 Notifications sent to UI:", notifications);
      console.log("🔍 Looking for notifications for:", user.uid);

  
      res.render("notifications", {
        user,
        notifications,
        currentRoute: "notifications"
      });
    } catch (error) {
      console.error("❌ Error loading notifications:", error.message);
      res.status(500).send("Failed to load notifications.");
    }
  });
  

export default router;
