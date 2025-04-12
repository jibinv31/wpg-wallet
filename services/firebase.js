import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

// 🔐 Decode base64 JSON and parse it
const serviceAccountJSON = Buffer.from(process.env.FIREBASE_BASE64_KEY, "base64").toString("utf-8");
const serviceAccount = JSON.parse(serviceAccountJSON);

// 🚀 Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

// 🔧 Firestore reference
const db = admin.firestore();

// 📦 Firebase Storage bucket reference
const storage = admin.storage().bucket();

// 📤 Export for usage in other files
export { admin, db, storage };
