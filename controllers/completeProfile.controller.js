import { admin, db, storage } from "../services/firebase.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { encrypt } from "../utils/encryption.js";
import { createUser } from "../models/user.model.js";

// 🧾 Render the Complete Profile Page
export const renderCompleteProfilePage = (req, res) => {
    const tempUser = req.session.tempGoogleUser;

    if (!tempUser) return res.redirect("/login");

    res.render("complete-profile", {
        user: tempUser,
        errorMessage: null,
        successMessage: null
    });
};

// ✅ Handle Submission of Complete Profile Form (CSRF Removed)
export const handleCompleteProfile = async (req, res) => {
    const tempUser = req.session.tempGoogleUser;

    if (!tempUser) return res.redirect("/login");

    const uid = tempUser.uid;
    const email = tempUser.email;
    const name = tempUser.name || "Google User";

    try {
        const { dob, ssn, address, postalCode, state } = req.body;
        const file = req.file;

        if (!file) {
            return res.render("complete-profile", {
                user: tempUser,
                errorMessage: "KYC Document is required.",
                successMessage: null
            });
        }

        // 🔐 Encrypt sensitive fields
        const encryptedSSN = encrypt(ssn);
        const encryptedAddress = encrypt(address);
        const encryptedPostalCode = encrypt(postalCode);
        const encryptedState = encrypt(state);

        // 📂 Upload KYC Document to Firebase Storage
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

        fs.unlink(file.path, () => { }); // Delete local temp file

        // 🧾 Store user profile in Firestore
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

        delete req.session.tempGoogleUser;

        req.session.successMessage = "✅ Profile completed. Awaiting admin validation.";
        res.redirect("/login");

    } catch (err) {
        console.error("❌ Complete Profile Error:", err.message);
        res.render("complete-profile", {
            user: tempUser,
            errorMessage: "Something went wrong. Please try again.",
            successMessage: null
        });
    }
};
