import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

import { getAccessToken } from "../config/daraja.js";

const BASE_URL =
    process.env.MPESA_ENV === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";


export async function initiateSTKPush({
    phoneNumber,
    amount,
    accountReference,
    transactionDesc
}) {

    const token = await getAccessToken();

    const timestamp = getTimestamp();

    const password = Buffer
        .from(
            `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
        )
        .toString("base64");

    const response = await axios.post(
        `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
        {
            BusinessShortCode:
                process.env.MPESA_SHORTCODE,

            Password: password,

            Timestamp: timestamp,

            TransactionType:
                "CustomerPayBillOnline",

            Amount: Math.round(Number(amount)),

            PartyA: phoneNumber,

            PartyB:
                process.env.MPESA_SHORTCODE,

            PhoneNumber: phoneNumber,

            CallBackURL:
                process.env.MPESA_CALLBACK_URL,

            AccountReference:
                accountReference,

            TransactionDesc:
                transactionDesc
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        }
    );

    return response.data;
}


function getTimestamp() {

    const date = new Date();

    const yyyy = date.getFullYear();

    const mm = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const dd = String(
        date.getDate()
    ).padStart(2, "0");

    const hh = String(
        date.getHours()
    ).padStart(2, "0");

    const mi = String(
        date.getMinutes()
    ).padStart(2, "0");

    const ss = String(
        date.getSeconds()
    ).padStart(2, "0");

    return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}