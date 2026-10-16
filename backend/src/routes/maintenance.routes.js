import express from "express";
import { getMaintenanceRequests } from "../controllers/maintenance.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
    "/",
    authenticate,
    authorize("admin", "landlord", "tenant"),
    getMaintenanceRequests
);

export default router;
