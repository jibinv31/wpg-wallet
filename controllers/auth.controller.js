import { admin, db } from "../services/firebase.js";

export const sessionLogin = async (req, res) => {
    const { idToken } = req.body;
    console.log("📥 Received ID token for session login");

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const email = decodedToken.email;
        console.log(`✅ Token verified for user: ${email} (UID: ${uid})`);

        req.session.user = { uid, email };

        // Create user in Firestore if not exists
        const userRef = db.collection("users").doc(uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            console.log("📄 Creating Firestore user doc...");
            await userRef.set({
                email,
                balance: 1000.0,
                createdAt: new Date().toISOString(),
            });
        } else {
            console.log("📦 Firestore user doc already exists");
        }

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
        res.redirect("/login");
    });
};
