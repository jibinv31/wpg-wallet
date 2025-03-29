// models/transaction.model.js
import { db } from "../services/firebase.js";

const transactionRef = db.collection("transactions");

// Create a new transaction log
export const createTransaction = async (transaction) => {
  const doc = await transactionRef.add({
    ...transaction,
    createdAt: new Date().toISOString(),
  });
  return doc.id;
};

// Optional: Fetch transactions by user or account
export const getTransactionsByUser = async (userId) => {
  const snapshot = await transactionRef.where("userId", "==", userId).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
