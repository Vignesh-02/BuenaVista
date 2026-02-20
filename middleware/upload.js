/**
 * Multer config and error handler for location image uploads (ImageKit).
 * Max 5MB; JPEG, PNG, GIF, WebP only.
 */
const multer = require("multer");

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_SIZE },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Only images are allowed (JPEG, PNG, GIF, WebP). Videos and other files are not allowed."
                ),
                false
            );
        }
    },
});

/**
 * Express error middleware for multer upload route. Handles LIMIT_FILE_SIZE and fileFilter errors.
 */
function handleUploadError(err, req, res, next) {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Image is too large. Maximum size is 5 MB." });
    }
    if (err.message && err.message.includes("Only images are allowed")) {
        return res.status(400).json({ error: err.message });
    }
    next(err);
}

module.exports = { upload, handleUploadError };
