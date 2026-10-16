import {
    importPartnerFeed,
    PartnerFeedValidationError
} from "../services/partner-feed.service.js";

export const importPartnerListings = async (req, res) => {
    try {
        const result = await importPartnerFeed(req.body);
        return res.json({
            success: true,
            message: `${result.imported} partner listings were imported or updated.`,
            ...result
        });
    } catch (error) {
        if (error instanceof SyntaxError) {
            return res.status(400).json({
                success: false,
                message: "The partner feed must be valid JSON."
            });
        }
        if (error instanceof PartnerFeedValidationError) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        console.error("PARTNER LISTING IMPORT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to import the partner listing feed."
        });
    }
};
