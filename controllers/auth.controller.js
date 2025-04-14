import { admin, db, storage } from "../services/firebase.js";
import { getUserById, createUser } from "../models/user.model.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { decrypt, encrypt } from "../utils/encryption.js";
import { sendOTPEmail } from "../utils/email.js";
import { verifyOTPCode } from "../utils/otp.js";
import { getAuth } from "firebase-admin/auth";

// ✅ Session Login (handles both normal users and super admins)
export const sessionLogin = async (req, res) => {
  const { idToken, name, otp } = req.body;
  console.log("📥 Received session login request...");

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const signInProvider = decodedToken.firebase?.sign_in_provider;

    console.log(`✅ Verified token for user: ${email} (UID: ${uid})`);

    if (!otp && signInProvider !== "google.com") {
      return res.status(400).json({ error: "OTP is required" });
    }

    // 🔍 Check if super admin
    const superAdminSnap = await db.collection("super_admins").doc(uid).get();
    const isSuperAdmin = superAdminSnap.exists;

    if (isSuperAdmin) {
      req.session.user = {
        uid,
        email,
        name: name || "Super Admin",
        isSuperAdmin: true
      };

      console.log("🔐 Super admin logged in.");
      return res.status(200).json({
        message: "Super admin session created",
        redirect: "/admin-dashboard"
      });
    }

    // 🔍 Check if regular user exists
    const user = await getUserById(uid);
    if (!user) {
      await admin.auth().deleteUser(uid);
      console.log(`🗑️ Deleted incomplete user ${email} from Firebase Auth`);
      return res.status(403).json({
        error: "You are not registered with WPG Wallet. Please complete your KYC to continue."
      });
    }

    if (user.isValidated === false) {
      return res.status(403).json({ error: "User not yet validated by admin." });
    }

    if (user.isBlocked === true) {
      return res.status(403).json({ error: "Your account has been blocked by the admin." });
    }

    // ✅ Decrypt sensitive data
    const decryptedSSN = user.ssn ? decrypt(user.ssn) : null;
    const decryptedAddress = user.address ? decrypt(user.address) : null;
    const decryptedPostalCode = user.postalCode ? decrypt(user.postalCode) : null;
    const decryptedState = user.state ? decrypt(user.state) : null;

    console.log("🔓 Decrypted values for session:", {
      decryptedSSN,
      decryptedAddress,
      decryptedPostalCode,
      decryptedState
    });

    req.session.user = {
      uid,
      email,
      name: user.name || name || "User",
      dob: user.dob || "N/A",
      ssn: decryptedSSN ? "****" + decryptedSSN.slice(-2) : "N/A",
      decryptedSSN: decryptedSSN || "N/A",
      address: decryptedAddress || "N/A",
      postalCode: decryptedPostalCode || "N/A",
      state: decryptedState || "N/A",
      isSuperAdmin: false
    };

    console.log("✅ User session created.");
    return res.status(200).json({ message: "Session created", redirect: "/dashboard" });

  } catch (error) {
    console.error("❌ Session login error:", error.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// ✅ Signup + KYC Document Upload (pure logic – toast handled in route)
export const handleSignup = async (req) => {
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

    if (!file) throw new Error("KYC document is required.");

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const existing = await getUserById(uid);
    if (existing) {
      throw new Error("Email already exists.");
    }

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

    fs.unlink(file.path, (err) => {
      if (err) console.warn("⚠️ Could not delete temp file:", file.path);
    });

    console.log("🔐 Raw values before encryption:", {
      name,
      dob,
      ssn,
      address,
      postalCode,
      state
    });

    const encryptedAddress = encrypt(address);
    const encryptedPostalCode = encrypt(postalCode);
    const encryptedSSN = encrypt(ssn);
    const encryptedState = encrypt(state);

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

    console.log("✅ User and document stored. Awaiting admin validation.");
    return { success: true };

  } catch (err) {
    console.error("❌ Signup error:", err.message);
    throw new Error(err.message || "Signup failed.");
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
    res.render("landing");
  });
};

// 🔁 Forgot Password: Render Form
export const renderForgotPasswordPage = (req, res) => {
  res.render("forgot-password", { message: null });
};

// 🔁 Forgot Password: Handle Submission
export const handleForgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const link = await getAuth().generatePasswordResetLink(email);

    console.log("📩 Password reset link:", link);

    res.render("forgot-password", {
      message: `✅ A password reset link has been sent to ${email}.`,
    });

    // Optional: You can email this link to the user via nodemailer
  } catch (error) {
    console.error("❌ Error generating password reset link:", error.message);
    res.render("forgot-password", {
      message: "❌ Failed to send password reset link. Please try again.",
    });
  }
};
