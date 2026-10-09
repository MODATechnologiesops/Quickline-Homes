import express from "express";

import {
    createPayment,
    getPaymentById,
    getUserPayments,
    completePayment
} from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/", createPayment);

router.get("/:id", getPaymentById);

router.get("/user/:userId", getUserPayments);

router.post("/:id/complete", completePayment);

export default router;