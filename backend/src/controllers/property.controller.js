import pool from "../config/db.js";
import { readFile, unlink } from "node:fs/promises";

const PROPERTY_TYPES = new Set([
    "apartment",
    "house",
    "villa",
    "commercial",
    "office",
    "mall",
    "hostel",
    "warehouse",
    "land",
    "other"
]);

function textValue(value, maxLength) {
    return typeof value === "string" && value.trim().length <= maxLength
        ? value.trim()
        : null;
}

function numericValue(value, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER, integer = false } = {}) {
    if (value === undefined || value === null || value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < minimum || number > maximum || (integer && !Number.isInteger(number))) {
        return null;
    }
    return number;
}

async function removeUploadedFiles(files = []) {
    await Promise.all(files.map(async (file) => {
        try {
            await unlink(file.path);
        } catch (error) {
            if (error.code !== "ENOENT") {
                console.error("REMOVE FAILED PROPERTY IMAGE:", error);
            }
        }
    }));
}

function validOptionalDate(value) {
    if (value === undefined || value === null || value === "") return true;
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function matchesImageSignature(file, contents) {
    if (file.mimetype === "image/jpeg") {
        return contents[0] === 0xff && contents[1] === 0xd8 && contents[2] === 0xff;
    }
    if (file.mimetype === "image/png") {
        return contents.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (file.mimetype === "image/webp") {
        return contents.toString("ascii", 0, 4) === "RIFF"
            && contents.toString("ascii", 8, 12) === "WEBP";
    }
    return false;
}

// ==========================================
// CREATE PROPERTY
// ==========================================
export const createProperty = async (req, res) => {
    try {
        const {
            name,
            propertyType,
            description,
            address,
            city,
            county,
            latitude,
            longitude,
            totalUnits
        } = req.body;

        if (!name || !address) {
            return res.status(400).json({
                success: false,
                message: "Property name and address are required."
            });
        }

        const result = await pool.query(
            `INSERT INTO properties
            (
                landlord_id,
                name,
                property_type,
                description,
                address,
                city,
                county,
                latitude,
                longitude,
                total_units
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING *`,
            [
                req.user.id,
                name,
                propertyType || null,
                description || null,
                address,
                city || null,
                county || null,
                latitude || null,
                longitude || null,
                totalUnits || 0
            ]
        );

        res.status(201).json({
            success: true,
            message: "Property created successfully.",
            property: result.rows[0]
        });

    } catch (error) {
        console.error("CREATE PROPERTY ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to create property."
        });
    }
};

export const createPropertyListing = async (req, res) => {
    const body = req.body || {};
    const files = req.files || [];
    const name = textValue(body.name, 255);
    const address = textValue(body.address, 500);
    const propertyType = body.propertyType;
    const listingPurpose = body.listingPurpose;
    const price = numericValue(body.price, { minimum: 0.01, maximum: 9999999999.99 });
    const description = body.description === undefined || body.description === ""
        ? null
        : textValue(body.description, 8000);
    const city = body.city === "" ? null : textValue(body.city, 100);
    const county = body.county === "" ? null : textValue(body.county, 100);
    const neighborhood = body.neighborhood === "" ? null : textValue(body.neighborhood, 150);
    const bedrooms = numericValue(body.bedrooms, { maximum: 100, integer: true }) ?? 0;
    const bathrooms = numericValue(body.bathrooms, { maximum: 100, integer: true }) ?? 0;
    const totalUnits = numericValue(body.totalUnits, { maximum: 100000, integer: true }) ?? 0;
    const floorArea = numericValue(body.floorArea, { minimum: 0.01, maximum: 99999999 });
    const paymentTerms = body.paymentTerms === "" ? null : textValue(body.paymentTerms, 2000);
    const availableFrom = body.availableFrom || null;
    const furnished = body.furnished === "true";
    const validPropertyTypes = PROPERTY_TYPES.has(propertyType);
    const validPurpose = listingPurpose === "rent" || listingPurpose === "sale";
    const optionalTextIsValid = (value, maximum) =>
        value === undefined || value === "" || textValue(value, maximum) !== null;

    if (!name || !address || !validPropertyTypes || !validPurpose || price === null
        || (body.description && description === null)
        || (body.bedrooms !== undefined && body.bedrooms !== "" && numericValue(body.bedrooms, { maximum: 100, integer: true }) === null)
        || (body.bathrooms !== undefined && body.bathrooms !== "" && numericValue(body.bathrooms, { maximum: 100, integer: true }) === null)
        || (body.totalUnits !== undefined && body.totalUnits !== "" && numericValue(body.totalUnits, { maximum: 100000, integer: true }) === null)
        || (body.floorArea && floorArea === null)
        || !optionalTextIsValid(body.city, 100)
        || !optionalTextIsValid(body.county, 100)
        || !optionalTextIsValid(body.neighborhood, 150)
        || !optionalTextIsValid(body.paymentTerms, 2000)
        || (body.furnished !== undefined && !["true", "false"].includes(body.furnished))
        || !validOptionalDate(availableFrom)
        || !files.length) {
        await removeUploadedFiles(files);
        return res.status(400).json({
            success: false,
            message: "Provide property details, a valid rent/sale price, and at least one property image."
        });
    }

    try {
        const validImages = await Promise.all(files.map(async (file) =>
            matchesImageSignature(file, await readFile(file.path))
        ));
        if (validImages.some((valid) => !valid)) {
            await removeUploadedFiles(files);
            return res.status(400).json({
                success: false,
                message: "One or more uploaded files are not valid JPEG, PNG, or WebP images."
            });
        }
    } catch (error) {
        await removeUploadedFiles(files);
        console.error("VALIDATE PROPERTY IMAGE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to verify the uploaded property images."
        });
    }

    const serverOrigin = (process.env.PUBLIC_BACKEND_URL || `${req.protocol}://${req.get("host")}`)
        .replace(/\/+$/, "");
    const imageUrls = files.map((file) => `${serverOrigin}/uploads/properties/${file.filename}`);
    let client;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        const propertyResult = await client.query(
            `INSERT INTO properties (
                landlord_id, name, property_type, description, address,
                city, county, total_units, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
            RETURNING id, name, property_type, description, address, city, county, total_units, status, created_at`,
            [req.user.id, name, propertyType, description, address, city, county, totalUnits]
        );
        const property = propertyResult.rows[0];

        for (const [index, imageUrl] of imageUrls.entries()) {
            await client.query(
                `INSERT INTO property_images (property_id, image_url, is_primary)
                 VALUES ($1, $2, $3)`,
                [property.id, imageUrl, index === 0]
            );
        }

        const listingResult = await client.query(
            `INSERT INTO property_listings (
                property_id, title, description, property_type, listing_purpose,
                listing_status, city, county, neighborhood, address, price,
                currency, bedrooms, bathrooms, floor_area, furnished,
                available_from, image_url, payment_terms, source_platform
            )
            VALUES (
                $1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, $10,
                'KES', $11, $12, $13, $14, $15, $16, $17, 'Quickline Homes'
            )
            RETURNING id, title, listing_purpose, price, currency, listing_status, image_url`,
            [
                property.id,
                name,
                description,
                propertyType,
                listingPurpose,
                city,
                county,
                neighborhood,
                address,
                price,
                bedrooms,
                bathrooms,
                floorArea,
                furnished,
                availableFrom,
                imageUrls[0],
                paymentTerms
            ]
        );

        await client.query("COMMIT");
        return res.status(201).json({
            success: true,
            message: "Property published to the Quickline Homes marketplace.",
            property: { ...property, image_urls: imageUrls },
            listing: listingResult.rows[0]
        });
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("ROLLBACK LANDLORD PROPERTY ERROR:", rollbackError);
            }
        }
        await removeUploadedFiles(files);
        console.error("CREATE LANDLORD MARKETPLACE PROPERTY ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to publish this property. Check the property details and try again."
        });
    } finally {
        client?.release();
    }
};


// ==========================================
// GET LANDLORD PROPERTIES
// ==========================================
export const getProperties = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                p.*,
                (
                    SELECT image_url
                    FROM property_images
                    WHERE property_id = p.id
                    ORDER BY is_primary DESC, id ASC
                    LIMIT 1
                ) AS image_url,
                COUNT(pu.id)::INTEGER AS unit_count,
                COUNT(
                    CASE
                        WHEN pu.status = 'occupied'
                        THEN 1
                    END
                )::INTEGER AS occupied_units,
                COUNT(
                    CASE
                        WHEN pu.status = 'vacant'
                        THEN 1
                    END
                )::INTEGER AS vacant_units
             FROM properties p
             LEFT JOIN property_units pu
                ON p.id = pu.property_id
             WHERE p.landlord_id = $1
             GROUP BY p.id
             ORDER BY p.created_at DESC`,
            [req.user.id]
        );

        res.json({
            success: true,
            count: result.rows.length,
            properties: result.rows
        });

    } catch (error) {
        console.error("GET PROPERTIES ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve properties."
        });
    }
};


// ==========================================
// GET SINGLE PROPERTY
// ==========================================
export const getProperty = async (req, res) => {
    try {
        const { id } = req.params;

        const property = await pool.query(
            `SELECT *
             FROM properties
             WHERE id = $1
             AND landlord_id = $2`,
            [id, req.user.id]
        );

        if (property.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Property not found."
            });
        }

        const units = await pool.query(
            `SELECT *
             FROM property_units
             WHERE property_id = $1
             ORDER BY unit_number`,
            [id]
        );

        res.json({
            success: true,
            property: property.rows[0],
            units: units.rows
        });

    } catch (error) {
        console.error("GET PROPERTY ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve property."
        });
    }
};


// ==========================================
// UPDATE PROPERTY
// ==========================================
export const updateProperty = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            propertyType,
            description,
            address,
            city,
            county,
            latitude,
            longitude,
            totalUnits
        } = req.body;

        const result = await pool.query(
            `UPDATE properties
             SET
                name = COALESCE($1, name),
                property_type = COALESCE($2, property_type),
                description = COALESCE($3, description),
                address = COALESCE($4, address),
                city = COALESCE($5, city),
                county = COALESCE($6, county),
                latitude = COALESCE($7, latitude),
                longitude = COALESCE($8, longitude),
                total_units = COALESCE($9, total_units),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $10
             AND landlord_id = $11
             RETURNING *`,
            [
                name,
                propertyType,
                description,
                address,
                city,
                county,
                latitude,
                longitude,
                totalUnits,
                id,
                req.user.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Property not found."
            });
        }

        res.json({
            success: true,
            message: "Property updated successfully.",
            property: result.rows[0]
        });

    } catch (error) {
        console.error("UPDATE PROPERTY ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update property."
        });
    }
};


// ==========================================
// DELETE PROPERTY
// ==========================================
export const deleteProperty = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM properties
             WHERE id = $1
             AND landlord_id = $2
             RETURNING id`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Property not found."
            });
        }

        res.json({
            success: true,
            message: "Property deleted successfully."
        });

    } catch (error) {
        console.error("DELETE PROPERTY ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to delete property."
        });
    }
};