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


// Simulate delay (e.g., 1 minute) before updating status
const simulateTransferSuccess = async (
  transferId,
  sourceAccountId,
  currentBalance,
  amount,
  uid,
  recipientEmail,
  senderEmail
) => {


  console.log(`⏳ Simulating delayed transfer success for ${transferId}...`);

  setTimeout(async () => {
    try {
      const transferDoc = await db.collection("transfers").doc(transferId).get();
      if (!transferDoc.exists) return;

      const transfer = transferDoc.data();

      // ✅ 1. Mark transfer as success
      await db.collection("transfers").doc(transferId).update({
        status: "success",
        completedAt: new Date().toISOString(),
      });

      // ✅ Create success notification
      await db.collection("notifications").add({
        userId: uid,
        message: `✅ Transfer of $${amount.toFixed(2)} to ${recipientEmail} completed successfully.`,
        type: "success",
        read: false,
        createdAt: new Date().toISOString(),
      });

      console.log(`✅ Transfer ${transferId} marked as SUCCESS`);

      // ✅ 2. Deduct from sender
      await db.collection("linked_banks").doc(sourceAccountId).update({
        balance: currentBalance - amount,
      });

      // ✅ 3. Credit to recipient (if found)
      const recipientSnap = await db
        .collection("linked_banks")
        .where("userEmail", "==", transfer.recipientEmail)
        .where("accountNumber", "==", transfer.to)
        .get();

      if (!recipientSnap.empty) {
        const recipientDoc = recipientSnap.docs[0];
        const recipientData = recipientDoc.data();

        await db.collection("linked_banks").doc(recipientDoc.id).update({
          balance: recipientData.balance + amount,
        });

        console.log(`✅ Credited $${amount} to ${transfer.recipientEmail}`);

        // 5. Create recipient notification
        // Assumes that the recipient's linked bank document contains a field 'userId'
        await db.collection("notifications").add({
          userId: recipientData.userId, // Recipient's user id
          message: `💰 You received $${amount.toFixed(2)} from ${senderEmail} into account ****${transfer.to}.`,
          type: "info",
          read: false,
          createdAt: new Date().toISOString(),
        });
      } else {
        console.log("⚠️ Recipient not found – skipping credit.");
      }

      console.log(`✅ Transfer ${transferId} completed.`);
    } catch (error) {
      console.error("❌ Error during transfer finalization:", error.message);
    }
  }, 60000); // 1 minute delay
};




export const processTransfer = async (req, res) => {
  const { sourceAccount, recipientEmail, recipientAccountNumber, amount, note } = req.body;
  const uid = req.session.user.uid;

  try {
    const transferAmount = parseFloat(amount);
    if (!sourceAccount || !recipientEmail || !recipientAccountNumber || isNaN(transferAmount)) {
      return res.status(400).send("Missing required transfer details.");
    }

    // 🔍 Get source account by Firestore doc ID
    const sourceDoc = await db.collection("linked_banks").doc(sourceAccount).get();

    if (!sourceDoc.exists || sourceDoc.data().userId !== uid) {
      return res.status(404).send("Source account not found.");
    }

    const sourceData = sourceDoc.data();

    // 🛑 Ensure enough balance BEFORE creating transfer
    if (transferAmount > sourceData.balance) {
      return res.status(400).send("Insufficient balance.");
    }

    // ⏳ Create transfer record (processing)
    const transferRef = await db.collection("transfers").add({
      userId: uid,
      from: sourceData.accountNumber,
      fromAccountId: sourceAccount,
      to: recipientAccountNumber,
      recipientEmail,
      amount: transferAmount,
      note,
      transferType: "transfer",
      status: "processing",
      createdAt: new Date().toISOString(),
    });

    // ✅ Create initial notification
    await db.collection("notifications").add({
      userId: uid,
      message: `💸 Transfer of $${transferAmount.toFixed(2)} to ${recipientEmail} initiated.`,
      type: "info",
      read: false,
      createdAt: new Date().toISOString(),
    });

    // ✅ Only simulate balance deduction after success
    simulateTransferSuccess(
      transferRef.id,
      sourceAccount,
      sourceData.balance,
      transferAmount,
      uid,
      recipientEmail,
      req.session.user.email || "unknown@example.com" // Use fallback if undefined
    );


    // res.redirect("/transactions");
    res.json({ success: true });

  } catch (err) {
    console.error("❌ Transfer Error:", err.message);
    res.status(500).send("Transfer failed.");
  }
};



