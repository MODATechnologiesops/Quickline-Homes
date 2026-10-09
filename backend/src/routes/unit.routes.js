import express from "express";

import {
    createUnit,
    getPropertyUnits,
    updateUnit,
    deleteUnit
} from "../controllers/unit.controller.js";

import {
    authenticate,
    authorize
} from "../middleware/auth.middleware.js";

const router = express.Router();


// Create unit under a property
router.post(
    "/properties/:propertyId/units",
    authenticate,
    authorize("landlord"),
    createUnit
);


// Get all units for a property
router.get(
    "/properties/:propertyId/units",
    authenticate,
    authorize("landlord"),
    getPropertyUnits
);


// Update unit
router.put(
    "/units/:id",
    authenticate,
    authorize("landlord"),
    updateUnit
);


// Delete unit
router.delete(
    "/units/:id",
    authenticate,
    authorize("landlord"),
    deleteUnit
);

export default router;