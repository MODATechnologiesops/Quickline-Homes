import {
    generateMonthlyRentCharges
} from "../services/rent-charge.service.js";


export const generateRentCharges = async (req, res) => {
    try {

        const {
            billingPeriod
        } = req.body;

        const result = await generateMonthlyRentCharges(
            billingPeriod || new Date()
        );

        res.status(201).json(result);

    } catch (error) {

        console.error(
            "GENERATE RENT CHARGES CONTROLLER ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to generate rent charges.",
            error: error.message
        });
    }
};