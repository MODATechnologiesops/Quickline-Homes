import express from "express";
import {
    createServiceRequest,
    getServiceRequests,
    updateServiceRequest
} from "../controllers/service.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/requests", createServiceRequest);
router.get("/requests", authenticate, authorize("admin"), getServiceRequests);
router.patch("/requests/:id", authenticate, authorize("admin"), updateServiceRequest);

export default router;
