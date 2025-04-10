import { db } from "../services/firebase.js";

// Get unread notification count for a user
export const getUnreadNotificationCount = async (uid) => {
  if (!uid) return 0;

  const snapshot = await db
    .collection("notifications")
    .where("userId", "==", uid)
    .where("read", "==", false)
    .get();

  return snapshot.size;
};

// Mark all unread notifications as read
export const markNotificationsAsRead = async (uid) => {
  if (!uid) return;

  const snapshot = await db
    .collection("notifications")
    .where("userId", "==", uid)
    .where("read", "==", false)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { read: true });
  });

  await batch.commit();
};
