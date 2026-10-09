import express from "express";

import {
    createProperty,
    getProperties,
    getProperty,
    updateProperty,
    deleteProperty
} from "../controllers/property.controller.js";

import {
    authenticate,
    authorize
} from "../middleware/auth.middleware.js";

const router = express.Router();


// Create property
router.post(
    "/",
    authenticate,
    authorize("landlord"),
    createProperty
);


// Get landlord's properties
router.get(
    "/",
    authenticate,
    authorize("landlord"),
    getProperties
);


// Get one property
router.get(
    "/:id",
    authenticate,
    authorize("landlord"),
    getProperty
);


// Update property
router.put(
    "/:id",
    authenticate,
    authorize("landlord"),
    updateProperty
);


// Delete property
router.delete(
    "/:id",
    authenticate,
    authorize("landlord"),
    deleteProperty
);

export default router;