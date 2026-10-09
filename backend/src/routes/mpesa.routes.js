import express from "express";

import {
    stkPush,
    mpesaCallback,
    c2bValidation,
    c2bConfirmation,
} from "../controllers/mpesa.controller.js";

const router = express.Router();


// Initiate STK Push
router.post("/stkpush", stkPush);


// Daraja callback
router.post("/callback", mpesaCallback);

router.post("/c2b/validation", c2bValidation);

router.post("/c2b/confirmation", c2bConfirmation);



export default router;