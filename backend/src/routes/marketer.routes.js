import express from "express";
import {
    archiveMarketerListing,
    createMarketerApplication,
    createMarketerListing,
    createReservationInquiry,
    getMarketerApplications,
    getMarketerInquiries,
    getMarketerListings,
    reviewMarketerApplication,
    updateMarketerInquiry,
    updateMarketerListing
} from "../controllers/marketer.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/applications", createMarketerApplication);
router.get(
    "/applications",
    authenticate,
    authorize("admin"),
    getMarketerApplications
);
router.post(
    "/applications/:id/review",
    authenticate,
    authorize("admin"),
    reviewMarketerApplication
);

router.get(
    "/listings",
    authenticate,
    authorize("marketer"),
    getMarketerListings
);
router.post(
    "/listings",
    authenticate,
    authorize("marketer"),
    createMarketerListing
);
router.put(
    "/listings/:id",
    authenticate,
    authorize("marketer"),
    updateMarketerListing
);
router.delete(
    "/listings/:id",
    authenticate,
    authorize("marketer"),
    archiveMarketerListing
);
router.get(
    "/inquiries",
    authenticate,
    authorize("marketer"),
    getMarketerInquiries
);
router.patch(
    "/inquiries/:id",
    authenticate,
    authorize("marketer"),
    updateMarketerInquiry
);

export default router;
