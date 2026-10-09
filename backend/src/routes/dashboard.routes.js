import express from "express";

import {
    adminDashboard,
    landlordDashboard,
    tenantDashboard
} from "../controllers/dashboard.controller.js";

import {
    authenticate,
    authorize
} from "../middleware/auth.middleware.js";

const router = express.Router();


// ADMIN
router.get(
    "/admin",
    authenticate,
    authorize("admin"),
    adminDashboard
);


// LANDLORD
router.get(
    "/landlord",
    authenticate,
    authorize("landlord"),
    landlordDashboard
);


// TENANT
router.get(
    "/tenant",
    authenticate,
    authorize("tenant"),
    tenantDashboard
);


export default router;