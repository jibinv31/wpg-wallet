import { db } from "../services/firebase.js";
import { plaidClient } from "../services/plaid.js";
import { decrypt } from "../utils/encryption.js";
import { Parser } from "json2csv";

export const getTransactionsPage = async (req, res) => {
    const userId = req.session.user?.uid;
    if (!userId) return res.redirect("/login");

    const { accountId, range = 30, category = "" } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(range));

    try {
        // 🔍 Fetch user's linked Plaid accounts
        const snapshot = await db.collection("linked_banks").where("userId", "==", userId).get();
        const accounts = snapshot.docs.map(doc => ({
            id: doc.id,
            bankName: doc.data().institution,
            accessToken: doc.data().accessToken,
        }));

        if (!accountId && accounts.length === 0) {
            return res.render("transactions", {
                user: req.session.user,
                transactions: [],
                accounts: [],
                selectedAccount: "",
                range,
                category,
                categories: [],
            });
        }

        const selected = accounts.find(acc => acc.id === accountId) || accounts[0];
        const accessToken = decrypt(selected.accessToken);

        const response = await plaidClient.transactionsGet({
            access_token: accessToken,
            start_date: startDate.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
            options: { count: 100 },
        });

        let transactions = response.data.transactions;

        // 🔘 Category filtering
        const allCategories = [...new Set(transactions.flatMap(txn => txn.category || []))];

        if (category) {
            transactions = transactions.filter(txn =>
                txn.category && txn.category.includes(category)
            );
        }

        res.render("transactions", {
            user: req.session.user,
            transactions,
            accounts,
            selectedAccount: selected.id,
            range,
            category,
            categories: allCategories,
        });

    } catch (error) {
        console.error("❌ Error fetching transactions:", error.message);
        res.status(500).send("Failed to load transaction history");
    }
};

export const exportTransactionsCSV = async (req, res) => {
    const userId = req.session.user?.uid;
    const { accountId, range = 30, category = "" } = req.query;

    try {
        const doc = await db.collection("linked_banks").doc(accountId).get();
        if (!doc.exists || doc.data().userId !== userId) {
            return res.status(403).send("Unauthorized");
        }

        const accessToken = decrypt(doc.data().accessToken);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - parseInt(range));

        const response = await plaidClient.transactionsGet({
            access_token: accessToken,
            start_date: startDate.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
        });

        let transactions = response.data.transactions;

        if (category) {
            transactions = transactions.filter(txn =>
                txn.category && txn.category.includes(category)
            );
        }

        const fields = ["date", "name", "amount", "category"];
        const parser = new Parser({ fields });
        const csv = parser.parse(transactions);

        res.header("Content-Type", "text/csv");
        res.attachment("transactions.csv");
        return res.send(csv);
    } catch (err) {
        console.error("CSV Export Error:", err.message);
        res.status(500).send("Failed to export CSV");
    }
};
