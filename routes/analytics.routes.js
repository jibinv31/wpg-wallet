// routes/analytics.routes.js
import express from "express";
import { renderSpendingAnalytics, updateSalary  } from "../controllers/analytics.controller.js";

const router = express.Router();

router.get("/analytics", renderSpendingAnalytics);

router.post("/salary", updateSalary);

export default router;


