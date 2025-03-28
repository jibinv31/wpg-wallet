// routes/plaid.routes.js
import express from "express";
import { plaidClient } from "../services/plaid.js";
import { db } from "../services/firebase.js";
import { encrypt } from "../utils/encryption.js";

const router = express.Router();

// 🔗 Create Link Token (🔁 Now using GET)
router.get("/create-link-token", async (req, res) => {
    try {
        const { uid: userId } = req.session.user;

        const response = await plaidClient.linkTokenCreate({
            user: { client_user_id: userId },
            client_name: "WPG Wallet",
            products: ["auth", "transactions"],
            language: "en",
            country_codes: ["US", "CA"],
        });

        res.json({ link_token: response.data.link_token });
    } catch (error) {
        console.error("❌ Error creating link token:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create link token" });
    }
});

// 🔁 Exchange Public Token for Access Token
router.post("/exchange-token", async (req, res) => {
    try {
        const { public_token } = req.body;
        const { uid: userId } = req.session.user;

        if (!public_token || !userId) {
            return res.status(400).json({ error: "Missing public_token or user session" });
        }

        const tokenResponse = await plaidClient.itemPublicTokenExchange({ public_token });
        const accessToken = tokenResponse.data.access_token;
        const itemId = tokenResponse.data.item_id;

        // Optional: Get institution name
        const itemInfo = await plaidClient.itemGet({ access_token: accessToken });
        const institutionId = itemInfo.data.item.institution_id;

        let institution = "Unknown Bank";
        if (institutionId) {
            const instRes = await plaidClient.institutionsGetById({
                institution_id: institutionId,
                country_codes: ["US", "CA"]
            });
            institution = instRes.data.institution.name;
        }

        // Encrypt and store access token
        const accessTokenEncrypted = encrypt(accessToken);

        await db.collection("linked_banks").add({
            userId,
            accessToken: accessTokenEncrypted,
            itemId,
            institution,
            linkedAt: new Date().toISOString(),
        });

        console.log(`✅ Public token exchanged & bank linked for user ${userId}`);

        res.json({ message: "Token exchange successful" });
    } catch (error) {
        console.error("❌ Error exchanging token:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to exchange token" });
    }
});

export default router;
