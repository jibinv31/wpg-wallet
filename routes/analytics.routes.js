// routes/analytics.routes.js
import express from "express";
import { renderSpendingAnalytics } from "../controllers/analytics.controller.js";

const router = express.Router();

router.get("/analytics", renderSpendingAnalytics);

export default router;


