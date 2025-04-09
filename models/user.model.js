import { db } from "../services/firebase.js";
import { encrypt, decrypt } from "../utils/encryption.js"; // 🔐 Import encryption helpers

const usersRef = db.collection("users");

export const createUser = async (uid, data) => {
  const encryptedData = {
    ...data,
    ssn: data.ssn ? encrypt(data.ssn) : "",
    address: data.address ? encrypt(data.address) : "",
    postalCode: data.postalCode ? encrypt(data.postalCode) : "",
  };

  await usersRef.doc(uid).set(encryptedData);
};

export const getUserById = async (uid) => {
  const userDoc = await usersRef.doc(uid).get();
  if (!userDoc.exists) return null;

  const data = userDoc.data();

  return {
    ...data,
    ssn: data.ssn ? decrypt(data.ssn) : "",
    address: data.address ? decrypt(data.address) : "",
    postalCode: data.postalCode ? decrypt(data.postalCode) : "",
  };
};

export const updateUser = async (uid, data) => {
  const encryptedData = {
    ...data,
    ...(data.ssn && { ssn: encrypt(data.ssn) }),
    ...(data.address && { address: encrypt(data.address) }),
    ...(data.postalCode && { postalCode: encrypt(data.postalCode) }),
  };

  await usersRef.doc(uid).update(encryptedData);
};

export const getUserByEmail = async (email) => {
  const snap = await db.collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].data(); // or { id: doc.id, ...doc.data() } if you want ID
};
