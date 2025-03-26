import { db } from "../services/firebase.js";

const budgetsRef = db.collection("budgets");

export const getBudgetsByUser = async (uid) => {
  const snap = await budgetsRef.where("userId", "==", uid).get();
  return snap.docs.map(doc => doc.data());
};

export const updateBudget = async (uid, category, amount) => {
  const snap = await budgetsRef
    .where("userId", "==", uid)
    .where("category", "==", category)
    .limit(1)
    .get();

  if (!snap.empty) {
    const docId = snap.docs[0].id;
    await budgetsRef.doc(docId).update({ usedAmount: amount });
  }
};
