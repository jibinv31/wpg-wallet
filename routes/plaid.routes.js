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
// router.post("/exchange-token", async (req, res) => {
//     try {
//         const { public_token } = req.body;
//         const { uid: userId } = req.session.user;

//         if (!public_token || !userId) {
//             return res.status(400).json({ error: "Missing public_token or user session" });
//         }

//         const tokenResponse = await plaidClient.itemPublicTokenExchange({ public_token });
//         const accessToken = tokenResponse.data.access_token;
//         const itemId = tokenResponse.data.item_id;

//         // Optional: Get institution name
//         const itemInfo = await plaidClient.itemGet({ access_token: accessToken });
//         const institutionId = itemInfo.data.item.institution_id;

//         let institution = "Unknown Bank";
//         if (institutionId) {
//             const instRes = await plaidClient.institutionsGetById({
//                 institution_id: institutionId,
//                 country_codes: ["US", "CA"]
//             });
//             institution = instRes.data.institution.name;
//         }

//         // Encrypt and store access token
//         const accessTokenEncrypted = encrypt(accessToken);

//         await db.collection("linked_banks").add({
//             userId,
//             accessToken: accessTokenEncrypted,
//             itemId,
//             institution,
//             linkedAt: new Date().toISOString(),
//         });


//         console.log(`✅ Public token exchanged & bank linked for user ${userId}`);

//         res.json({ message: "Token exchange successful" });
//     } catch (error) {
//         console.error("❌ Error exchanging token:", error.response?.data || error.message);
//         res.status(500).json({ error: "Failed to exchange token" });
//     }
// });


// 2️⃣ Exchange Token
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

        // ✅ Save to session
        req.session.plaid = {
            accessToken,
            institution,
        };

        console.log("✅ Session plaid data:", req.session.plaid);


        res.redirect("/plaid/select-accounts");
    } catch (error) {
        console.error("❌ Error exchanging token:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to exchange token" });
    }
});


  
// POST /select-accounts
// router.post("/select-accounts", async (req, res) => {
//     const { selectedAccounts } = req.body;
//     const { uid: userId } = req.session.user;
//     const { accessToken, institution } = req.session.plaid || {};
  
//     try {
//       if (!selectedAccounts || !accessToken || !institution) {
//         return res.status(400).send("Missing account selection or session data.");
//       }
  
//       const accountIds = Array.isArray(selectedAccounts)
//         ? selectedAccounts
//         : [selectedAccounts];
  
//       const accountsResponse = await plaidClient.accountsGet({
//         access_token: accessToken,
//       });
  
//       const selected = accountsResponse.data.accounts.filter(acct =>
//         accountIds.includes(acct.account_id)
//       );
  
//       const encryptedToken = encrypt(accessToken); // 🔐 Encrypt token once
  
//       for (const acct of selected) {
//         await db.collection("linked_banks").add({
//           userId,
//           accountId: acct.account_id,
//           accessToken: encryptedToken,
//           itemId: acct.account_id, // optional tracking
//           institution,
//           accountNumber: acct.mask || acct.account_id.slice(-4),
//           accountType: acct.subtype || "Plaid Linked",
//           balance: acct.balances.available ?? acct.balances.current ?? 0,
//           linkedAt: new Date().toISOString(),
//         });
//       }
  
//       console.log(`✅ Saved ${selected.length} selected Plaid accounts for ${userId}`);
//       res.redirect("/banks");
  
//     } catch (error) {
//       console.error("❌ Error saving selected accounts:", error.message);
//       res.status(500).send("Failed to save selected accounts.");
//     }
//   });

router.post("/select-accounts", async (req, res) => {
    const { selectedAccounts } = req.body;
    const { uid: userId, email: userEmail } = req.session.user;
    const { accessToken, institution } = req.session.plaid || {};

    try {
        if (!selectedAccounts || !accessToken || !institution) {
            return res.status(400).send("Missing account selection or session data.");
        }

        const accountIds = Array.isArray(selectedAccounts)
            ? selectedAccounts
            : [selectedAccounts];

        const accountsResponse = await plaidClient.accountsGet({
            access_token: accessToken,
        });

        const selected = accountsResponse.data.accounts.filter((acct) =>
            accountIds.includes(acct.account_id)
        );

        const encryptedToken = encrypt(accessToken);

        for (const acct of selected) {
            await db.collection("linked_banks").add({
                userId,
                userEmail: req.session.user.email, // ✅ Save for recipient lookup
                accessToken: encryptedToken,
                itemId: acct.account_id,
                institution,
                accountNumber: acct.mask || acct.account_id.slice(-4),
                accountType: acct.subtype || "Plaid Linked",
                balance: acct.balances.available ?? acct.balances.current ?? 0,
                linkedAt: new Date().toISOString(),
            });
        }

        console.log(`✅ Saved ${selected.length} selected Plaid accounts for ${userId}`);
        res.redirect("/banks");
    } catch (error) {
        console.error("❌ Error saving selected accounts:", error.message);
        res.status(500).send("Failed to save selected accounts.");
    }
});

  


// GET /select-accounts
router.get("/select-accounts", async (req, res) => {
    const { plaid, user } = req.session;

    if (!plaid || !plaid.accessToken) {
        return res.redirect("/dashboard"); // fallback if user tries to visit directly
    }

    try {
        const accountsResponse = await plaidClient.accountsGet({
            access_token: plaid.accessToken,
        });

        const accounts = accountsResponse.data.accounts.map((acct) => ({
            accountId: acct.account_id,
            bankName: plaid.institution,
            accountNumber: acct.mask || acct.account_id.slice(-4),
            accountType: acct.subtype || "Plaid Linked",
            balance: acct.balances.available ?? acct.balances.current ?? 0.00,
        }));

        res.render("select-accounts", {
            accounts,
            user,
            currentRoute: "banks"
        });
    } catch (error) {
        console.error("❌ Error loading Plaid accounts:", error.message);
        res.status(500).send("Failed to load accounts.");
    }
});


  export default router;