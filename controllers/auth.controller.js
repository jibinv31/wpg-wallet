import { admin, db, storage } from "../services/firebase.js";
import { getUserById, createUser } from "../models/user.model.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { decrypt, encrypt } from "../utils/encryption.js";

// ✅ Session Login (handles both normal users and super admins)
export const sessionLogin = async (req, res) => {
    const { idToken, name } = req.body;
    console.log("📥 Received session login request...");

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const email = decodedToken.email;

        console.log(`✅ Verified token for user: ${email} (UID: ${uid})`);

        // 🔍 Super Admin Check
        const superAdminSnap = await db.collection("super_admins").doc(uid).get();
        if (superAdminSnap.exists) {
            req.session.user = {
                uid,
                email,
                name: name || "Super Admin"
            };

            console.log("🔐 Super admin logged in.");
            return res.status(200).json({
                message: "Super admin session created",
                redirect: "/admin-dashboard"
            });
        }

        // 🔐 Normal user check
        const user = await getUserById(uid);
        if (!user) return res.status(403).json({ error: "Please complete full signup with KYC document." });
        if (user.isValidated === false) return res.status(403).json({ error: "User not yet validated by admin." });

        // ✅ Decrypt before saving to session
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
            state: decryptedState || "N/A"
        };

        return res.status(200).json({
            message: "Session created",
            redirect: "/dashboard"
        });

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
        if (!file) return res.status(400).json({ error: "KYC document is required." });

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const existing = await getUserById(uid);
        if (existing) return res.status(400).json({ error: "User already exists." });

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
