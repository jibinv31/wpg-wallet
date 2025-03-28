import { db } from "../services/firebase.js";

const accountsRef = db.collection("accounts");

// ✅ Add a new account for the user
export const addAccount = async (uid, account) => {
  if (!uid || !account) {
    throw new Error("Missing UID or account data");
  }

  return await accountsRef.add({
    ...account,
    userId: uid
  });
};

// ✅ Get all accounts linked to a user
export const getAccountsByUser = async (uid) => {
  const snap = await accountsRef.where("userId", "==", uid).get();
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// ✅ Delete account by document ID
export const deleteAccount = async (accountId) => {
  if (!accountId) throw new Error("Account ID is required");
  await accountsRef.doc(accountId).delete();
};
