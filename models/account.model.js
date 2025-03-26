import { db } from "../services/firebase.js";

const accountsRef = db.collection("accounts");

export const addAccount = async (uid, account) => {
  return await accountsRef.add({ ...account, userId: uid });
};

export const getAccountsByUser = async (uid) => {
  const snap = await accountsRef.where("userId", "==", uid).get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteAccount = async (accountId) => {
  await accountsRef.doc(accountId).delete();
};
