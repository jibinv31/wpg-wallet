import { db } from "../services/firebase.js";

const transactionsRef = db.collection("transactions");

export const addTransaction = async (transaction) => {
  return await transactionsRef.add(transaction);
};

export const getTransactionsByUser = async (uid) => {
  const snap = await transactionsRef.where("userId", "==", uid).orderBy("date", "desc").get();
  return snap.docs.map(doc => doc.data());
};
