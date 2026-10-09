import express from "express";
import { getAccessToken } from "../config/daraja.js";

const router = express.Router();

/**
 * Test Daraja OAuth authentication
 *
 * GET:
 * /api/daraja/test-auth
 */
router.get("/test-auth", async (req, res) => {
    try {
        const token = await getAccessToken();

        res.json({
            success: true,
            message: "Daraja authentication successful",
            tokenReceived: Boolean(token)
        });

    } catch (error) {
        console.error(
            "Daraja authentication failed:",
            error.response?.data || error.message
        );

        res.status(500).json({
            success: false,
            message: "Unable to obtain Daraja access token",
            error: error.response?.data || error.message
        });
    }
});

export default router;