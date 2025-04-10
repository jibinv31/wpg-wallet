import express from "express";
import { payBill, renderBillPaymentPage } from "../controllers/bill.controller.js";

const router = express.Router();

router.post("/pay", payBill);

router.get("/bill-payment", renderBillPaymentPage);

export default router;
