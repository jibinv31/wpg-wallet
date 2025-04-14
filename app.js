// app.js
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import csrf from "csurf"; // ✅ CSRF middleware
import { fileURLToPath } from "url";

// 🔁 Setup directory reference for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📦 Load environment variables
dotenv.config();

// ⚙️ Create Express app
const app = express();

// ✅ Create CSRF protection instance (no cookie mode)
const csrfProtection = csrf({ cookie: false });

// 📄 Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// 🔐 Session Setup
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

// ✅ Set CSRF token only for GET requests (safe forms)
app.use((req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD") {
        csrfProtection(req, res, () => {
            res.locals.csrfToken = req.csrfToken();
            next();
        });
    } else {
        next();
    }
});

// ✅ Middleware to validate CSRF for fetch requests (manually attach)
app.use((req, res, next) => {
    if (["POST", "PUT", "DELETE"].includes(req.method)) {
        return csrfProtection(req, res, next);
    }
    next();
});

// ✅ Route to send CSRF token to frontend
app.get("/csrf-token", (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// 📦 Import Routes
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

app.use(setNotificationCount);

// 🌐 Routes
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

// 🔁 Default route
app.get("/", (req, res) => {
    res.redirect("/landing");
});

// 🚀 Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 WPG Wallet server running at http://localhost:${PORT}`);
});
