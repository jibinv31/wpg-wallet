// app.js
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import transactionRoutes from "./routes/transactions.routes.js";
import notificationRoutes from "./routes/notifications.routes.js";
import { setNotificationCount } from "./middleware/notificationCount.js";
// 📦 Load environment variables
dotenv.config();

// 🔁 Setup directory reference for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ⚙️ Create Express app
const app = express();

// 📦 Import Routes
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import bankRoutes from "./routes/bank.routes.js";
import plaidRoutes from "./routes/plaid.routes.js";
import bankacRoutes from "./routes/bankac.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
// 📄 Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // Required for JSON POSTs like /sessionLogin
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

app.use(setNotificationCount);

// 🌐 Routes
app.use("/", authRoutes);
app.use("/", dashboardRoutes);
app.use("/", bankRoutes);
app.use("/", bankacRoutes);
app.use("/plaid", plaidRoutes); // ✅ Plaid integration with prefix
app.use("/", paymentRoutes);
app.use("/", transactionRoutes);
app.use("/", notificationRoutes);
app.use(setNotificationCount);

// 🔁 Default route
app.get("/", (req, res) => {
    res.redirect("/login");
});

// 🚀 Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 WPG Wallet server running at http://localhost:${PORT}`);
});
