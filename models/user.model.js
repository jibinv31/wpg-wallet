import { db } from "../services/firebase.js";

const usersRef = db.collection("users");

export const createUser = async (uid, data) => {
  await usersRef.doc(uid).set(data);
};

export const getUserById = async (uid) => {
  const userDoc = await usersRef.doc(uid).get();
  return userDoc.exists ? userDoc.data() : null;
};

export const updateUser = async (uid, data) => {
  await usersRef.doc(uid).update(data);
};
