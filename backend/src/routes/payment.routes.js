import express from "express";

import {
    createPayment,
    getPaymentById,
    getPaymentHistory,
    getUserPayments,
    completePayment
} from "../controllers/payment.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
    "/history",
    authenticate,
    authorize("admin", "landlord", "tenant"),
    getPaymentHistory
);

router.post("/", createPayment);

router.get("/:id", authenticate, authorize("admin", "landlord", "tenant"), getPaymentById);

router.get(
    "/user/:userId",
    authenticate,
    authorize("admin", "landlord", "tenant"),
    getUserPayments
);

router.post("/:id/complete", completePayment);

export default router;