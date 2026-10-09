import express from "express";

import {
    createLease,
    getLeases,
    getLease,
    updateLease,
    terminateLease
} from "../controllers/lease.controller.js";

const router = express.Router();

// GET all leases
router.get("/", getLeases);

// GET single lease
router.get("/:id", getLease);

// CREATE lease
router.post("/", createLease);

// UPDATE lease
router.put("/:id", updateLease);

// TERMINATE lease
router.post("/:id/terminate", terminateLease);

export default router;