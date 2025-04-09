import { admin, db, storage } from "../services/firebase.js";
import { getUserById, createUser } from "../models/user.model.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import multer from "multer";
import os from "os";
import fs from "fs";
import { sendOTPEmail } from "../utils/email.js";
import { verifyOTPCode } from "../utils/otp.js";


// ✅ Session Login (handles both normal users and super admins)
export const sessionLogin = async (req, res) => {
    const { idToken, name, otp } = req.body;
    console.log("📥 Received session login request...");
  
    if (!otp) {
      return res.status(400).json({ error: "OTP is required" });
    }
  
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const email = decodedToken.email;
  
      console.log(`✅ Verified token for user: ${email} (UID: ${uid})`);
  
      // 🔐 Validate OTP for everyone
      const isOTPValid = await verifyOTPCode(email, otp);
      if (!isOTPValid) {
        return res.status(401).json({ error: "Invalid OTP" });
      }
  
      // 🔍 Check if super admin
      const superAdminSnap = await db.collection("super_admins").doc(uid).get();
      const isSuperAdmin = superAdminSnap.exists;
  
      if (isSuperAdmin) {
        req.session.user = {
          uid,
          email,
          name: name || "Super Admin"
        };
        console.log("🔐 Super admin logged in.");
        return res.status(200).json({ message: "Super admin session created", redirect: "/admin-dashboard" });
      }
  
      // 🔍 Validate regular user
      const user = await getUserById(uid);
      if (!user) {
        return res.status(403).json({ error: "Please complete full signup with KYC document." });
      }
  
      if (user.isValidated === false) {
        return res.status(403).json({ error: "User not yet validated by admin." });
      }
  
      req.session.user = {
        uid,
        email,
        name: user.name || name || "User"
      };
  
      console.log("✅ User session created.");
      return res.status(200).json({ message: "Session created", redirect: "/dashboard" });
  
    } catch (error) {
      console.error("❌ Session login error:", error.message);
      return res.status(401).json({ error: "Unauthorized" });
    }
  };

// ✅ Signup + KYC Document Upload
export const handleSignup = async (req, res) => {
    try {
        const {
            idToken,
            name,
            email,
            dob,
            ssn,
            address,
            postalCode,
            state
        } = req.body;

        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: "KYC document is required." });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const existing = await getUserById(uid);
        if (existing) {
            return res.status(400).json({ error: "User already exists." });
        }

        // 📁 Upload KYC document to Firebase Storage
        const ext = path.extname(file.originalname);
        const uniqueName = `kyc_docs/${uid}_${uuidv4()}${ext}`;
        const firebaseFile = storage.file(uniqueName);

        await firebaseFile.save(fs.readFileSync(file.path), {
            metadata: {
                contentType: file.mimetype,
                metadata: {
                    firebaseStorageDownloadTokens: uuidv4()
                }
            }
        });

        const [url] = await firebaseFile.getSignedUrl({
            action: "read",
            expires: "03-01-2030"
        });

        // 🧹 Delete temp file
        fs.unlink(file.path, (err) => {
            if (err) console.warn("⚠️ Could not delete temp file:", file.path);
        });

        // 🧾 Save user to Firestore
        await createUser(uid, {
            name,
            email,
            dob,
            ssn,
            address,
            postalCode,
            state,
            isValidated: false,
            documentUrl: url,
            createdAt: new Date().toISOString()
        });

        console.log("✅ User and document stored. Awaiting admin validation.");
        res.status(200).json({ message: "Signup completed. Awaiting admin validation." });

    } catch (err) {
        console.error("❌ Signup error:", err.message);
        res.status(500).json({ error: "Signup failed." });
    }
};

// 🔴 Logout
export const logout = (req, res) => {
    console.log("👋 Logging out...");
    req.session.destroy((err) => {
        if (err) {
            console.error("❌ Logout error:", err.message);
            return res.status(500).send("Logout error");
        }
        console.log("✅ Session destroyed.");
        res.redirect("/login");
    });
};
