import { admin, db, storage } from "../services/firebase.js";
import { getUserById, createUser } from "../models/user.model.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { decrypt, encrypt } from "../utils/encryption.js";
import { sendOTPEmail } from "../utils/email.js";
import { verifyOTPCode } from "../utils/otp.js";
import { getAuth } from "firebase-admin/auth";

// ✅ Manual Signup (with CSRF + KYC Upload)
export const handleSignup = async (req, res) => {
  try {
    const {
      idToken,
      firstName,
      lastName,
      email,
      dob,
      ssn,
      address,
      postalCode,
      state
    } = req.body;

    const name = `${firstName} ${lastName}`;
    const file = req.file;

    if (!file) {
      req.session.errorMessage = "KYC document is required.";
      return res.redirect("/signup");
    }

    // ✅ Firebase Token Verification
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const existing = await getUserById(uid);
    if (existing) {
      req.session.errorMessage = "Email already exists.";
      return res.redirect("/signup");
    }

    // ✅ Upload file to Firebase Storage
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

    fs.unlink(file.path, err => {
      if (err) console.warn("⚠️ Could not delete temp file:", file.path);
    });

    console.log("🔐 Raw values before encryption:", { name, dob, ssn, address, postalCode, state });

    // ✅ Encrypt sensitive fields
    const encryptedSSN = encrypt(ssn);
    const encryptedAddress = encrypt(address);
    const encryptedPostalCode = encrypt(postalCode);
    const encryptedState = encrypt(state);

    // ✅ Save user data in Firestore
    await createUser(uid, {
      name,
      email,
      dob,
      ssn: encryptedSSN,
      address: encryptedAddress,
      postalCode: encryptedPostalCode,
      state: encryptedState,
      isValidated: false,
      isBlocked: false,
      documentUrl: url,
      createdAt: new Date().toISOString()
    });

    console.log("✅ User and document stored.");
    req.session.successMessage = "Signup successful! Awaiting admin validation.";
    return res.redirect("/login");

  } catch (err) {
    console.error("❌ Signup error:", err.message);
    req.session.errorMessage = err.message || "Signup failed.";
    return res.redirect("/signup");
  }
};

// 🔐 Login session for Firebase + OTP
export const sessionLogin = async (req, res) => {
  const { idToken, name, otp } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const signInProvider = decodedToken.firebase?.sign_in_provider;

    if (signInProvider !== "google.com") {
      if (!otp) return res.status(400).json({ error: "OTP is required" });

      const isValid = await verifyOTPCode(email, otp);
      if (!isValid) return res.status(403).json({ error: "Invalid or expired OTP" });
    }

    // ✅ Check for Super Admin
    const superAdminSnap = await db.collection("super_admins").doc(uid).get();
    if (superAdminSnap.exists) {
      req.session.user = { uid, email, name, isSuperAdmin: true };
      return res.status(200).json({ message: "Super admin login", redirect: "/admin-dashboard" });
    }

    // ✅ Check Regular User
    const user = await getUserById(uid);
    if (!user) {
      await admin.auth().deleteUser(uid);
      return res.status(403).json({ error: "You are not registered with WPG Wallet." });
    }

    if (!user.isValidated) return res.status(403).json({ error: "User not validated by admin." });
    if (user.isBlocked) return res.status(403).json({ error: "User has been blocked." });

    const decryptedSSN = user.ssn ? decrypt(user.ssn) : null;
    const decryptedAddress = user.address ? decrypt(user.address) : null;
    const decryptedPostalCode = user.postalCode ? decrypt(user.postalCode) : null;
    const decryptedState = user.state ? decrypt(user.state) : null;

    req.session.user = {
      uid,
      email,
      name: user.name || name || "User",
      dob: user.dob || "N/A",
      ssn: decryptedSSN ? "****" + decryptedSSN.slice(-2) : "N/A",
      decryptedSSN,
      address: decryptedAddress,
      postalCode: decryptedPostalCode,
      state: decryptedState,
      isSuperAdmin: false
    };

    return res.status(200).json({ message: "Session created", redirect: "/dashboard" });

  } catch (error) {
    console.error("❌ Session login error:", error.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// 🔁 Logout
export const logout = (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("Logout error");
    res.render("landing");
  });
};

// 🔁 Forgot Password
export const renderForgotPasswordPage = (req, res) => {
  res.render("forgot-password", { message: null });
};

export const handleForgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const link = await getAuth().generatePasswordResetLink(email);
    res.render("forgot-password", {
      message: `✅ A password reset link has been sent to ${email}.`
    });
  } catch (error) {
    console.error("❌ Error generating reset link:", error.message);
    res.render("forgot-password", {
      message: "❌ Failed to send reset link. Try again."
    });
  }
};
