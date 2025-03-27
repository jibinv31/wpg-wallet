import { admin, db } from "../services/firebase.js";
import { getUserById, createUser } from "../models/user.model.js";

export const sessionLogin = async (req, res) => {
    const { idToken, name } = req.body;
    console.log("📥 Received ID token for session login");

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const email = decodedToken.email;
        console.log(`✅ Token verified for user: ${email} (UID: ${uid})`);

        let user = await getUserById(uid);

        if (!user) {
            if (!name || name.trim() === "") {
                console.warn("⚠️ Missing name for new user. Cannot create Firestore user.");
                return res.status(400).json({ error: "Name is required for new user creation." });
            }

            console.log("🆕 Creating new Firestore user...");
            await createUser(uid, {
                name: name.trim(),
                email,
                balance: 1000,
                createdAt: new Date().toISOString(),
            });

            user = { name: name.trim(), email };
        } else {
            console.log("📦 Firestore user doc already exists");
        }

        req.session.user = {
            uid,
            email,
            name: user.name || name || "User"
        };

        return res.status(200).json({ message: "Session created" });
    } catch (error) {
        console.error("❌ Error verifying token or creating session:", error.message);
        return res.status(401).json({ error: "Unauthorized" });
    }
};

export const logout = (req, res) => {
    console.log("👋 Logging out user...");
    req.session.destroy((err) => {
        if (err) {
            console.error("❌ Error destroying session:", err.message);
            return res.status(500).send("Logout error");
        }
        console.log("✅ Session destroyed. Redirecting to login.");
        res.redirect("/login");
    });
};
