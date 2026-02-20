/**
 * ImageKit client for server-side uploads.
 * Uses IMAGEKIT_PRIVATE_KEY, IMAGEKIT_PUBLIC_KEY, IMAGEKIT_URL from env.
 * Folder "locations" should exist in ImageKit Media Library.
 */
const ImageKit = require("@imagekit/nodejs");
const { toFile } = ImageKit;

/** Normalize env value: trim, remove newlines, remove surrounding quotes. Stops 403 from stray spaces in .env */
function cleanEnv(value) {
    if (value == null || typeof value !== "string") return "";
    return value
        .trim()
        .replace(/\s+/g, "")
        .replace(/(^["']|["']$)/g, "");
}

function getImageKit() {
    const privateKey = cleanEnv(process.env.IMAGEKIT_PRIVATE_KEY);
    const publicKey = cleanEnv(process.env.IMAGEKIT_PUBLIC_KEY);
    const urlEndpoint = cleanEnv(process.env.IMAGEKIT_URL);
    if (!privateKey || !publicKey || !urlEndpoint) {
        throw new Error(
            "ImageKit env vars IMAGEKIT_PRIVATE_KEY, IMAGEKIT_PUBLIC_KEY, IMAGEKIT_URL are required"
        );
    }
    const endpoint = urlEndpoint.endsWith("/") ? urlEndpoint.slice(0, -1) : urlEndpoint;
    return new ImageKit({
        privateKey,
        publicKey,
        urlEndpoint: endpoint,
    });
}

const UPLOAD_FOLDER = "locations";

/**
 * Upload a file buffer to ImageKit in the "locations" folder.
 * @param {Buffer} fileBuffer - File contents
 * @param {string} fileName - Original filename (e.g. photo.jpg)
 * @param {string} [mimeType] - Optional MIME type (unused; ImageKit infers from file)
 * @returns {Promise<{ url: string }>} - The public URL of the uploaded image
 */
async function uploadLocationImage(fileBuffer, fileName, _mimeType) {
    const imagekit = getImageKit();
    const file = await toFile(fileBuffer, fileName);
    const uniqueName = `${Date.now()}-${(fileName || "image").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const response = await imagekit.files.upload({
        file,
        fileName: uniqueName,
        folder: UPLOAD_FOLDER,
    });
    return { url: response.url };
}

/**
 * Returns a URL optimized for display (resize + quality). Only transforms ImageKit URLs; others returned as-is.
 * Show page uses 640px for sharpness (both uploads and pasted URLs display in the same smaller container).
 * @param {string} url - Full image URL (ImageKit or external)
 * @param {{ size: 'show' | 'thumb' }} [options] - show: 640px wide, high quality; thumb: 400px for cards
 * @returns {string}
 */
function getDisplayImageUrl(url, options) {
    if (!url || typeof url !== "string") return url;
    const u = url.trim();
    const urlEndpoint = cleanEnv(process.env.IMAGEKIT_URL);
    if (!urlEndpoint) return u;
    const base = urlEndpoint.endsWith("/") ? urlEndpoint : urlEndpoint + "/";
    const size = options?.size || "show";
    const tr = size === "thumb" ? "tr:w-400,q-85" : "tr:w-640,q-90";

    if (u.includes("ik.imagekit.io") && u.startsWith(urlEndpoint)) {
        return base + tr + "/" + u.slice(base.length);
    }
    if (
        size === "show" &&
        (u.startsWith("http://") || u.startsWith("https://")) &&
        process.env.IMAGEKIT_USE_WEB_PROXY === "true"
    ) {
        return base + tr + "/" + encodeURIComponent(u);
    }
    return u;
}

module.exports = { getImageKit, uploadLocationImage, getDisplayImageUrl, UPLOAD_FOLDER };
