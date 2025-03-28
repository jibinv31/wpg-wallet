import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import dotenv from "dotenv";

dotenv.config();

// Plaid configuration
const configuration = new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV],
    baseOptions: {
        headers: {
            "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
            "PLAID-SECRET": process.env.PLAID_SECRET,
        },
    },
});

const plaidClient = new PlaidApi(configuration);

// 🔗 Generate Link Token
export const createLinkToken = async (req, res) => {
    try {
        const userId = req.session?.user?.uid;
        if (!userId) return res.status(401).json({ error: "User not authenticated" });

        const tokenResponse = await plaidClient.linkTokenCreate({
            user: { client_user_id: userId },
            client_name: "WPG Wallet",
            products: ["auth", "transactions"],
            country_codes: ["US", "CA"],
            language: "en",
        });

        res.json({ link_token: tokenResponse.data.link_token });
    } catch (error) {
        console.error("❌ Failed to create link token:", error.message);
        res.status(500).json({ error: "Unable to generate link token" });
    }
};

// 🔁 Exchange Public Token for Access Token
export const exchangePublicToken = async (req, res) => {
    try {
        const { public_token } = req.body;
        const userId = req.session?.user?.uid;

        if (!userId || !public_token) {
            return res.status(400).json({ error: "Missing public token or session" });
        }

        const response = await plaidClient.itemPublicTokenExchange({ public_token });
        const accessToken = response.data.access_token;
        const itemId = response.data.item_id;

        // For now, log the accessToken (🔒 you should save it encrypted in the database)
        console.log(`✅ Public token exchanged: Access Token = ${accessToken}, Item ID = ${itemId}`);

        res.status(200).json({ message: "Token exchanged successfully" });
    } catch (error) {
        console.error("❌ Error exchanging token:", error.message);
        res.status(500).json({ error: "Token exchange failed" });
    }
};
