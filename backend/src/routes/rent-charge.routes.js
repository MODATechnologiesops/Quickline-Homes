import express from "express";

import {
    generateRentCharges
} from "../controllers/rent-charge.controller.js";

const router = express.Router();

router.post(
    "/generate",
    generateRentCharges
);

export default router;