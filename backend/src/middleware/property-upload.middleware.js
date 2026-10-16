import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const uploadDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../uploads/properties"
);
const imageTypes = new Map([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"]
]);

const storage = multer.diskStorage({
    destination(_req, _file, callback) {
        mkdir(uploadDirectory, { recursive: true }, (error) => {
            callback(error, uploadDirectory);
        });
    },
    filename(_req, file, callback) {
        callback(null, `${randomUUID()}${imageTypes.get(file.mimetype) || ""}`);
    }
});

const upload = multer({
    storage,
    limits: {
        files: 8,
        fileSize: 5 * 1024 * 1024
    },
    fileFilter(_req, file, callback) {
        if (!imageTypes.has(file.mimetype)) {
            callback(new Error("Property photos must be JPEG, PNG, or WebP images."));
            return;
        }
        callback(null, true);
    }
});

export default upload;
export { uploadDirectory };
