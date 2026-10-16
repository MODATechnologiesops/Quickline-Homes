import express from "express";

import {
    getListings,
    getListingById,
    getLocationIntelligence,
    refreshLocationIntelligence
} from "../controllers/listing.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { importPartnerListings } from "../controllers/partner-feed.controller.js";
import {
    createMarketerListing,
    updateMarketerListing,
    archiveMarketerListing,
    createReservationInquiry
} from "../controllers/marketer.controller.js";

const router = express.Router();

router.get("/", getListings);
router.post(
    "/partners/import",
    authenticate,
    authorize("admin"),
    importPartnerListings
);
router.get("/:id/intelligence", getLocationIntelligence);
router.post(
    "/:id/intelligence/refresh",
    authenticate,
    authorize("admin"),
    refreshLocationIntelligence
);
router.get("/:id", getListingById);
router.post(
    "/",
    authenticate,
    authorize("marketer"),
    createMarketerListing
);
router.put(
    "/:id",
    authenticate,
    authorize("marketer"),
    updateMarketerListing
);
router.delete(
    "/:id",
    authenticate,
    authorize("marketer"),
    archiveMarketerListing
);
router.post("/:id/inquiries", createReservationInquiry);

export default router;