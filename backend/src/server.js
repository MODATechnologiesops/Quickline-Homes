// ==========================================
// QUICKLINE HOMES - MAIN SERVER
// ==========================================

import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cors from "cors";

// ==========================================
// EXISTING ROUTES
// ==========================================

import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import propertyRoutes from "./routes/property.routes.js";
import unitRoutes from "./routes/unit.routes.js";
import leaseRoutes from "./routes/lease.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import tenantRoutes from "./routes/tenant.routes.js";
import chargeRoutes from "./routes/charge.routes.js";
import listingRoutes from "./routes/listing.routes.js";
import listingImageRoutes from "./routes/listing.image.routes.js";
import rentChargeRoutes from "./routes/rent-charge.routes.js";
// ==========================================
// MPESA / DARAJA ROUTES
// ==========================================

import darajaRoutes from "./routes/daraja.routes.js";
import mpesaRoutes from "./routes/mpesa.routes.js";


// ==========================================
// EXPRESS APP
// ==========================================

const app = express();

const PORT = Number(process.env.PORT || 5000);


// ==========================================
// GLOBAL MIDDLEWARE
// ==========================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


// ==========================================
// API ROUTES
// ==========================================


// Authentication
app.use(
    "/api/auth",
    authRoutes
);


// Dashboard
app.use(
    "/api/dashboard",
    dashboardRoutes
);


// Properties
app.use(
    "/api/properties",
    propertyRoutes
);


// Property Units
app.use(
    "/api",
    unitRoutes
);


// Leases
app.use(
    "/api/leases",
    leaseRoutes
);


// Payments
app.use(
    "/api/payments",
    paymentRoutes
);

// Tenants
app.use(
    "/api/tenants",
    tenantRoutes
);

// Charges
app.use(
    "/api/charges",
    chargeRoutes
);

// Rent Charges
app.use(
    "/api/rent-charges",
    rentChargeRoutes
);

// Property Listings
app.use("/api/listings", listingRoutes);

// Property Listing Images
app.use("/api/listings", listingImageRoutes);

// ==========================================
// SAFARICOM DARAJA
// ==========================================

// Daraja authentication/test routes
app.use(
    "/api/daraja",
    darajaRoutes
);


// ==========================================
// M-PESA
// ==========================================

// STK Push
// Callback
// Payment status
// M-Pesa related operations
app.use(
    "/api/mpesa",
    mpesaRoutes
);


// ==========================================
// ROOT ROUTE
// ==========================================

app.get("/", (req, res) => {

    res.status(200).json({
        success: true,
        application: "Quickline Homes",
        message: "Quickline Homes API is running",
        version: "1.0.0"
    });

});


// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {

    res.status(200).json({
        success: true,
        server: "online",
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString()
    });

});


// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {

    res.status(404).json({
        success: false,
        message: "API route not found",
        path: req.originalUrl
    });

});


// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {

    console.error("GLOBAL SERVER ERROR:");
    console.error(err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error"
    });

});


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {

    console.log("");
    console.log("==============================================");
    console.log("🚀 QUICKLINE HOMES BACKEND");
    console.log("==============================================");

    console.log(`Server:      http://localhost:${PORT}`);

    console.log("----------------------------------------------");
    console.log("APPLICATION ROUTES");
    console.log("----------------------------------------------");

    console.log("Auth:        /api/auth");
    console.log("Dashboard:   /api/dashboard");
    console.log("Properties:  /api/properties");
    console.log("Units:       /api/properties/:propertyId/units");
    console.log("Leases:      /api/leases");
    console.log("Payments:    /api/payments");

    console.log("----------------------------------------------");
    console.log("MPESA / DARAJA ROUTES");
    console.log("----------------------------------------------");

    console.log("Daraja:      /api/daraja");
    console.log("M-Pesa:      /api/mpesa");

    console.log("----------------------------------------------");
    console.log("SYSTEM");
    console.log("----------------------------------------------");

    console.log("Health:      /api/health");
    console.log("Environment:", process.env.NODE_ENV || "development");

    console.log("==============================================");
    console.log("");

});