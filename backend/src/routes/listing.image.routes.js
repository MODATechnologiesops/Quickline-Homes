import express from "express";

import {
    getListingImages,
    addListingImage,
    deleteListingImage
} from "../controllers/listing.image.controller.js";

const router = express.Router();

router.get("/:listingId/images", getListingImages);

router.post("/:listingId/images", addListingImage);

router.delete("/:listingId/images/:imageId", deleteListingImage);

export default router;