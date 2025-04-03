import { db } from "../services/firebase.js";
import { plaidClient } from "../services/plaid.js";
import { decrypt } from "../utils/encryption.js";
import { Parser } from "json2csv";

// 🧠 Fetch both Plaid + manual transfers
const getCombinedTransactions = async (userId, accountId, startDate, endDate, category) => {
    const allTxns = [];

    // 🔹 Manual Transfers from Firestore
    const transferSnap = await db.collection("transfers")
        .where("userId", "==", userId)
        .get();

    transferSnap.forEach(doc => {
        const tx = doc.data();
        const createdAt = new Date(tx.createdAt);

        const isInRange = createdAt >= startDate && createdAt <= endDate;
        const isAccountMatch = !accountId || tx.fromAccountId === accountId;
        const isCategoryMatch = !category || (tx.category && tx.category.includes(category));

        if (isInRange && isAccountMatch && isCategoryMatch) {
            allTxns.push({
                date: tx.createdAt,
                name: `Transfer to ${tx.recipientEmail}`,
                amount: -Math.abs(tx.amount),
                category: ["Manual Transfer"],
                status: tx.status || "success"
            });
        }
    });

    // 🔹 Plaid Transactions
    const accountsSnap = await db.collection("linked_banks").where("userId", "==", userId).get();
    const accounts = accountsSnap.docs.map(doc => ({
        id: doc.id,
        bankName: doc.data().institution,
        accessToken: doc.data().accessToken
    }));

    const selected = accounts.find(acc => acc.id === accountId) || accounts[0];
    if (!selected) return allTxns;

    try {
        const accessToken = decrypt(selected.accessToken);
        const plaidRes = await plaidClient.transactionsGet({
            access_token: accessToken,
            start_date: startDate.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
            options: { count: 100 }
        });

        const plaidTxns = plaidRes.data.transactions.filter(txn => {
            return !category || (txn.category && txn.category.includes(category));
        }).map(txn => ({
            ...txn,
            status: "posted"
        }));

        allTxns.push(...plaidTxns);
    } catch (err) {
        console.warn("⚠️ Error fetching from Plaid:", err.message);
    }

    return allTxns.sort((a, b) => new Date(b.date) - new Date(a.date));
};

// 📄 Render page
export const getTransactionsPage = async (req, res) => {
    const userId = req.session.user?.uid;
    if (!userId) return res.redirect("/login");

    const { accountId, range = 30, category = "" } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(range));

    try {
        const accountsSnap = await db.collection("linked_banks").where("userId", "==", userId).get();
        const accounts = accountsSnap.docs.map(doc => ({
            id: doc.id,
            bankName: doc.data().institution,
            accessToken: doc.data().accessToken,
            accountNumber: doc.data().accountNumber || "Plaid Linked"
        }));

        const transactions = await getCombinedTransactions(userId, accountId, startDate, endDate, category);
        const allCategories = [...new Set(transactions.flatMap(tx => tx.category || []))];

        res.render("transactions", {
            user: req.session.user,
            transactions,
            accounts,
            selectedAccount: accountId || "",
            range,
            category,
            categories: allCategories
        });

    } catch (error) {
        console.error("❌ Error loading transactions:", error.message);
        res.status(500).send("Failed to load transaction history");
    }
};

// 📤 Export CSV
export const exportTransactionsCSV = async (req, res) => {
    const userId = req.session.user?.uid;
    const { accountId, range = 30, category = "" } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(range));

    const transactions = await getCombinedTransactions(userId, accountId, startDate, endDate, category);

    const fields = ["date", "name", "amount", "status", "category"];
    const parser = new Parser({ fields });
    const csv = parser.parse(transactions);

    res.header("Content-Type", "text/csv");
    res.attachment("transactions.csv");
    res.send(csv);
};
