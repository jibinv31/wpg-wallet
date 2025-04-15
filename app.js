// app.js
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import csrf from "csurf";
import { fileURLToPath } from "url";

// Setup directory reference for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();

// View engine and static files
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Body parsers
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session setup (MUST come before CSRF)
app.use(
    session({
        secret: process.env.SESSION_SECRET || "wpgwallet-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24, // 1 day
        },
    })
);

// CSRF middleware
const csrfProtection = csrf({ cookie: false });

// ✅ Apply CSRF selectively
app.use((req, res, next) => {
    if (req.method === "POST" && req.originalUrl === "/signup") {
        console.warn("⚠️ CSRF middleware skipped for /signup");
        return next(); // Skip CSRF for /signup POST
    }

    if (["POST", "PUT", "DELETE"].includes(req.method)) {
        return csrfProtection(req, res, next);
    }

    // Inject CSRF token for GET/HEAD
    if (["GET", "HEAD"].includes(req.method)) {
        return csrfProtection(req, res, () => {
            try {
                const token = req.csrfToken();
                res.locals.csrfToken = token;
                console.log("✅ CSRF token injected into res.locals.csrfToken:", token);
            } catch (err) {
                console.error("❌ Failed to generate CSRF token:", err.message);
            }
            next();
        });
    }

    next();
});

// ✅ Expose CSRF token via API
app.get("/csrf-token", (req, res) => {
    try {
        const token = req.csrfToken();
        console.log("📤 /csrf-token generated:", token);
        res.json({ csrfToken: token });
    } catch (e) {
        console.error("❌ Could not generate CSRF token:", e.message);
        res.status(500).json({ error: "CSRF token generation failed." });
    }
});

// 🔥 Global CSRF error logger
app.use((err, req, res, next) => {
    if (err.code === "EBADCSRFTOKEN") {
        console.error("❌ CSRF validation failed!");
        console.log("➡️ Method:", req.method);
        console.log("➡️ URL:", req.originalUrl);
        console.log("➡️ Token from body:", req.body?._csrf);
        console.log("➡️ Token from headers:", req.headers["csrf-token"]);
        console.log("➡️ Session ID:", req.sessionID);
        return res.status(403).send("Invalid CSRF token. Please refresh the page.");
    }
    next(err);
});

// Import Routes
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import bankRoutes from "./routes/bank.routes.js";
import plaidRoutes from "./routes/plaid.routes.js";
import bankacRoutes from "./routes/bankac.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import transactionRoutes from "./routes/transactions.routes.js";
import notificationRoutes from "./routes/notifications.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import billRoutes from "./routes/bills.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import { setNotificationCount } from "./middleware/notificationCount.js";

// 🔔 Middleware
app.use(setNotificationCount);

// Register Routes
app.use("/", authRoutes);
app.use("/", dashboardRoutes);
app.use("/", bankRoutes);
app.use("/", bankacRoutes);
app.use("/plaid", plaidRoutes);
app.use("/", paymentRoutes);
app.use("/", transactionRoutes);
app.use("/", notificationRoutes);
app.use(adminRoutes);
app.use("/", billRoutes);
app.use("/", analyticsRoutes);

// Default route
app.get("/", (req, res) => {
    res.redirect("/landing");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 WPG Wallet server running at http://localhost:${PORT}`);
});
