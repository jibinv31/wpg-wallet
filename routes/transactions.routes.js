import express from "express";
import {
    getTransactionsPage,
    exportTransactionsCSV,
} from "../controllers/transactions.controller.js";

const router = express.Router();

router.get("/transactions", getTransactionsPage);
router.get("/transactions/export", exportTransactionsCSV);

export default router;
