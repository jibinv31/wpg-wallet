import admin from "firebase-admin";
import { readFileSync } from "fs";
import dotenv from "dotenv";

dotenv.config(); // Load .env variables

// 🔐 Load service account credentials
const serviceAccount = JSON.parse(
    readFileSync("./firebaseServiceKey.json", "utf-8")
);

// 🚀 Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // 🔗 from .env
});

// 🔧 Firestore reference
const db = admin.firestore();

// 📦 Storage bucket reference
const storage = admin.storage().bucket();

// 📤 Export for usage in other files
export { admin, db, storage };
