// routes/dashboard.routes.js
import express from "express";
import { renderDashboard } from "../controllers/dashboard.controller.js";

const router = express.Router();

// Route: GET /dashboard
router.get("/dashboard", renderDashboard);

export default router;
