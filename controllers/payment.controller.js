import { db } from "../services/firebase.js";
import { sendTransferConfirmationToSender, sendTransferNotificationToRecipient } from "../utils/email.js";

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

            // ✅ Email sender
            try {
              await sendTransferConfirmationToSender(
                senderEmail,
                amount,
                recipientEmail,
                transfer.to.slice(-4) // last 4 digits of recipient account
              );
              console.log(`✅ Email sent to ${senderEmail}`);
              
            } catch (err) {
              console.error("❌ Failed to send sender email:", err.message);
            }

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


        // ✅ Email recipient
        try {
          await sendTransferNotificationToRecipient(
            recipientEmail,
            amount,
            senderEmail,
            transfer.to.slice(-4)
          );
          console.log(`✅ Email sent to ${recipientEmail}`);          
        } catch (err) {
          console.error("❌ Failed to send recipient email:", err.message);
        }

        // ✅ 4. Create recipient notification
        await db.collection("notifications").add({
          userId: recipientData.userId,
          message: `💰 You received $${amount.toFixed(2)} from ${senderEmail} into account ****${transfer.to}.`,
          type: "info",
          read: false,
          createdAt: new Date().toISOString(),
        });

        // ✅ 5. Create credit transaction for recipient
        await db.collection("transfers").add({
          userId: recipientData.userId,
          from: transfer.from,
          fromEmail: senderEmail,
          to: transfer.to,
          toAccountId: recipientDoc.id,
          recipientEmail: transfer.recipientEmail,
          amount: transfer.amount,
          note: transfer.note || '',
          transferType: "transfer",
          status: "success",
          createdAt: new Date().toISOString(),
          type: "credit"
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

    const sourceDoc = await db.collection("linked_banks").doc(sourceAccount).get();

    if (!sourceDoc.exists || sourceDoc.data().userId !== uid) {
      return res.status(404).send("Source account not found.");
    }

    const sourceData = sourceDoc.data();

    // 🚫 Prevent transfer to your own account
    if (
      recipientEmail === req.session.user.email &&
      recipientAccountNumber === sourceData.accountNumber
    ) {
      return res.status(400).json({
        success: false,
        message: "You cannot transfer to your own account."
      });
    }

    if (transferAmount > sourceData.balance) {
      return res.status(400).send("Insufficient balance.");
    }

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
      type: "debit"
    });

    await db.collection("notifications").add({
      userId: uid,
      message: `💸 Transfer of $${transferAmount.toFixed(2)} to ${recipientEmail} initiated.`,
      type: "info",
      read: false,
      createdAt: new Date().toISOString(),
    });

    simulateTransferSuccess(
      transferRef.id,
      sourceAccount,
      sourceData.balance,
      transferAmount,
      uid,
      recipientEmail,
      req.session.user.email || "unknown@example.com"
    );

    res.json({ success: true });

  } catch (err) {
    console.error("❌ Transfer Error:", err.message);
    res.status(500).send("Transfer failed.");
  }
};
