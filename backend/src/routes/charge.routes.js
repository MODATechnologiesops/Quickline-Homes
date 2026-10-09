import express from "express";

import {
    getChargeTypes,
    createCharge,
    getCharges,
    getTenantCharges
} from "../controllers/charge.controller.js";

const router = express.Router();

router.get("/types", getChargeTypes);

router.post("/", createCharge);

router.get("/", getCharges);

router.get("/tenant/:tenantId", getTenantCharges);

export default router;