// models/plaid.model.js
import { db } from "../services/firebase.js";
import { decrypt } from "../utils/encryption.js";
import { plaidClient } from "../services/plaid.js";

export const getAccountsByUser = async (uid) => {
  const snapshot = await db.collection("linked_banks").where("userId", "==", uid).get();
  const accounts = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const accessToken = decrypt(data.accessToken);
    if (!accessToken) continue;

    try {
      // 🔍 Fetch all accounts from Plaid
      const response = await plaidClient.accountsGet({ access_token: accessToken });
      const allPlaidAccounts = response.data.accounts;

      // ✅ Match only the linked accountId
      const linked = allPlaidAccounts.find(acct => acct.account_id === data.accountId);
      if (linked) {
        accounts.push({
          id: data.accountId, // used as option value in dropdown
          bankName: data.institution,
          accountNumber: data.accountNumber || linked.mask || linked.account_id.slice(-4),
          accountType: data.accountType || linked.subtype || "Plaid Linked",
          balance: linked.balances.available ?? linked.balances.current ?? 0,
          createdAt: data.linkedAt,
        });
      }

    } catch (error) {
      console.error(`❌ Failed to get account for ${uid}:`, error.message);
    }
  }

  return accounts;
};
