// models/plaid.model.js
import { db } from "../services/firebase.js";
import { decrypt } from "../utils/encryption.js";
import { plaidClient } from "../services/plaid.js";

export const getAccountsByUser = async (uid) => {
  const snapshot = await db.collection("linked_banks").where("userId", "==", uid).get();

  const allAccounts = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const accessToken = decrypt(data.accessToken);
    if (!accessToken) continue;
    try {
      const response = await plaidClient.accountsGet({ access_token: accessToken });
      const plaidAccounts = response.data.accounts;

      plaidAccounts.forEach((acct) => {
        allAccounts.push({
          bankName: data.institution,
          accountNumber: acct.mask || acct.account_id.slice(-4),
          accountType: acct.subtype || "Plaid Linked",
          balance: acct.balances.available ?? acct.balances.current ?? 0,
          createdAt: data.linkedAt,
        });
      });
    } catch (err) {
      console.error(`❌ Error fetching Plaid accounts for ${uid}:`, err.message);
    }
  }

  return allAccounts;
};
