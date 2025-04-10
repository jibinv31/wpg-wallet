// controllers/bill.controller.js
import { db } from "../services/firebase.js";
import { getUnreadNotificationCount } from "../utils/notifications.js";



export const renderBillPaymentPage = async (req, res) => {
    const uid = req.session?.user?.uid;
    if (!uid) return res.redirect("/login");
  
    const banksSnap = await db.collection("linked_banks").where("userId", "==", uid).get();
    const accounts = banksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
    const billersSnap = await db.collection("saved_billers").where("userId", "==", uid).get();
    const savedBillers = billersSnap.docs.map(doc => doc.data());
  
    res.render("bill-payment", {
      user: req.session.user,
      accounts,
      savedBillers,
      notificationCount: await getUnreadNotificationCount(uid),
    });
  };
  
  

export const payBill = async (req, res) => {
  const { billType, provider, consumerId, amount, note, sourceAccount } = req.body;
  const uid = req.session?.user?.uid;
  if (!uid) return res.redirect("/login");

  try {
    const billAmount = parseFloat(amount);
    if (isNaN(billAmount) || billAmount <= 0) {
      return res.status(400).send("Invalid amount");
    }

    const sourceDoc = await db.collection("linked_banks").doc(sourceAccount).get();
    if (!sourceDoc.exists || sourceDoc.data().userId !== uid) {
      return res.status(404).send("Source account not found");
    }

    const accountData = sourceDoc.data();
    if (billAmount > accountData.balance) {
      return res.status(400).send("Insufficient balance");
    }

    // Deduct amount
    await db.collection("linked_banks").doc(sourceAccount).update({
      balance: accountData.balance - billAmount
    });

    // Save to transfers collection instead of "bills"
    await db.collection("transfers").add({
      userId: uid,
      from: accountData.accountNumber,
      fromAccountId: sourceAccount,
      to: provider,
      recipientEmail: "-", // optional
      amount: billAmount,
      note: note || `Payment for ${billType} bill`,
      billType,
      transferType: "bill",
      consumerId,
      status: "success",
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    });

    // ✅ Save biller if user wants to
if (req.body.saveBiller === "true") {
    await db.collection("saved_billers").add({
      userId: uid,
      billType,
      provider,
      consumerId,
      createdAt: new Date().toISOString()
    });
  }

    // Optional: Notification
    await db.collection("notifications").add({
      userId: uid,
      message: `📢 Paid $${billAmount.toFixed(2)} to ${provider} (${billType})`,
      type: "info",
      read: false,
      createdAt: new Date().toISOString()
    });

    res.redirect("/transactions");

  } catch (err) {
    console.error("❌ Bill Payment Error:", err.message);
    res.status(500).send("Bill payment failed");
  }
};
