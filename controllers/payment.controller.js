import { db } from "../services/firebase.js";

// Helper: Get user's linked bank by ID
const getLinkedBankById = async (uid, docId) => {
  const doc = await db.collection("linked_banks").doc(docId).get();
  if (!doc.exists || doc.data().userId !== uid) return null;
  return { id: doc.id, ...doc.data() };
};

// Helper: Find recipient bank
const findRecipientAccount = async (email, accountNumber) => {
  const snap = await db
    .collection("linked_banks")
    .where("userEmail", "==", email)
    .where("accountNumber", "==", accountNumber)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
};

export const processTransfer = async (req, res) => {
  const userId = req.session.user.uid;
  const { sourceAccount, recipientEmail, recipientAccountNumber, amount, note } = req.body;

  const transferAmount = parseFloat(amount);
  if (!transferAmount || transferAmount <= 0) {
    return res.status(400).send("Invalid transfer amount.");
  }

  try {
    const senderBank = await getLinkedBankById(userId, sourceAccount);
    if (!senderBank) return res.status(400).send("Invalid source account.");

    if (senderBank.balance < transferAmount) {
      return res.status(400).send("Insufficient funds.");
    }

    const recipientBank = await findRecipientAccount(recipientEmail, recipientAccountNumber);
    if (!recipientBank) {
      return res.status(400).send("Recipient not found.");
    }

    const senderRef = db.collection("linked_banks").doc(senderBank.id);
    const recipientRef = db.collection("linked_banks").doc(recipientBank.id);
    const transactionRef = db.collection("transactions").doc();

    // 🧾 Firestore batch
    const batch = db.batch();

    batch.update(senderRef, { balance: senderBank.balance - transferAmount });
    batch.update(recipientRef, { balance: (recipientBank.balance || 0) + transferAmount });

    batch.set(transactionRef, {
      from: senderBank.accountNumber,
      to: recipientBank.accountNumber,
      senderEmail: req.session.user.email,
      recipientEmail,
      amount: transferAmount,
      note: note || "",
      status: "Success",
      date: new Date().toISOString(),
    });

    await batch.commit();

    console.log(`✅ Transfer of $${transferAmount} from ${senderBank.accountNumber} to ${recipientAccountNumber} completed.`);

    res.redirect("/dashboard");
  } catch (err) {
    console.error("❌ Transfer error:", err.message);
    res.status(500).send("Transfer failed.");
  }
};
