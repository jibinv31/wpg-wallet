// middleware/notificationCount.js
import { db } from "../services/firebase.js";

export const setNotificationCount = async (req, res, next) => {
  if (req.session.user) {
    try {
      const snap = await db.collection("notifications")
        .where("userId", "==", req.session.user.uid)
        .where("read", "==", false)
        .get();
      res.locals.notificationCount = snap.size;
    } catch (error) {
      console.error("Error fetching notification count:", error.message);
      res.locals.notificationCount = 0;
    }
  } else {
    res.locals.notificationCount = 0;
  }
  next();
};
