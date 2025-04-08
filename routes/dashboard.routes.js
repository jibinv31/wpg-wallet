// routes/dashboard.routes.js
import express from "express";
import { renderDashboard } from "../controllers/dashboard.controller.js";

const router = express.Router();

// Route: GET /dashboard
router.get("/dashboard", renderDashboard);

router.get("/", (req, res) => {
    res.render("landing"); // This renders views/landing.ejs
  });

export default router;
