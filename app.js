import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import bankRoutes from "./routes/bank.routes.js";
// Setup
dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // 👈 Needed for JSON requests from frontend (like sessionLogin)
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || "wpgwallet-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

// Routes
app.use("/", authRoutes);
app.use("/", dashboardRoutes);
app.use("/", bankRoutes);

// Default route (optional)
app.get("/", (req, res) => {
    res.redirect("/login");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 WPG Wallet server running at http://localhost:${PORT}`);
});
