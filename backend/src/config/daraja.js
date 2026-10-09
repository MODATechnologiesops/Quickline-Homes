import "dotenv/config";
import axios from "axios";

const DARAJA_BASE_URL =
    process.env.DARAJA_ENV === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";

/**
 * Get Daraja OAuth access token.
 *
 * This function ONLY needs:
 * DARAJA_CONSUMER_KEY
 * DARAJA_CONSUMER_SECRET
 */
export async function getAccessToken() {
    const key = process.env.DARAJA_CONSUMER_KEY;
    const secret = process.env.DARAJA_CONSUMER_SECRET;

    console.log("=================================");
    console.log("DARAJA AUTHENTICATION");
    console.log("Environment:", process.env.DARAJA_ENV);
    console.log("Consumer key loaded:", Boolean(key));
    console.log("Consumer secret loaded:", Boolean(secret));
    console.log("=================================");

    if (!key || !secret) {
        throw new Error(
            "DARAJA_CONSUMER_KEY or DARAJA_CONSUMER_SECRET is missing from .env"
        );
    }

    const credentials = Buffer
        .from(`${key}:${secret}`)
        .toString("base64");

    try {
        const response = await axios.get(
            `${DARAJA_BASE_URL}/oauth/v1/generate`,
            {
                params: {
                    grant_type: "client_credentials"
                },
                headers: {
                    Authorization: `Basic ${credentials}`,
                    Accept: "application/json"
                },
                timeout: 15000
            }
        );

        if (!response.data?.access_token) {
            throw new Error("Daraja response did not contain an access token");
        }

        return response.data.access_token;

    } catch (error) {
        console.error("=================================");
        console.error("DARAJA AUTH ERROR");

        if (error.response) {
            console.error("HTTP Status:", error.response.status);
            console.error("Response:", error.response.data);
        } else {
            console.error("Error:", error.message);
        }

        console.error("=================================");

        throw error;
    }
}