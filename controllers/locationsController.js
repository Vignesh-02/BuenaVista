/**
 * Locations controller: CRUD, like, upload, extract image.
 */
const cheerio = require("cheerio");
const Location = require("../models/location");
const { uploadLocationImage } = require("../lib/imagekit");
const { sendLocationCreatedEmail } = require("../lib/email");

/** Returns true if URL is safe for server-side fetch (no localhost, private IPs, or cloud metadata). */
function isUrlAllowedForFetch(urlString) {
    try {
        const parsed = new URL(urlString);
        const hostname = (parsed.hostname || "").toLowerCase();
        if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1")
            return false;
        const parts = hostname.replace(/^\[|\]$/g, "").split(".");
        const a = parseInt(parts[0], 10) || 0;
        const b = parseInt(parts[1], 10) || 0;
        if (parts.length === 4 && !Number.isNaN(a) && !Number.isNaN(b)) {
            if (a === 10) return false;
            if (a === 172 && b >= 16 && b <= 31) return false;
            if (a === 192 && b === 168) return false;
            if (a === 169 && b === 254) return false;
            if (a === 0 && b === 0) return false;
        }
        return true;
    } catch (e) {
        return false;
    }
}

/** Returns direct image URL from Google Images "Copy link" (imgres?imgurl=...) or null. */
function getGoogleImagesImgUrl(urlString) {
    try {
        const parsed = new URL(urlString);
        if (
            (parsed.hostname === "www.google.com" || parsed.hostname === "google.com") &&
            parsed.pathname.includes("/imgres")
        ) {
            const imgurl = parsed.searchParams.get("imgurl");
            if (imgurl && (imgurl.startsWith("http://") || imgurl.startsWith("https://"))) {
                return imgurl;
            }
        }
    } catch (e) {
        // Not a valid URL
    }
    return null;
}

/**
 * GET /locations - List all locations (no cache).
 */
async function showAllLocations(req, res) {
    try {
        res.set("Cache-Control", "private, no-store");
        const allLocations = await Location.find({});
        res.render("locations/index", { locations: allLocations });
    } catch (err) {
        console.log(err);
        req.flash("error", "Something went wrong");
        res.redirect("/");
    }
}

/**
 * GET /locations/api/likes - JSON like counts for all locations.
 */
async function apiLikes(req, res) {
    try {
        res.set("Cache-Control", "no-store");
        const docs = await Location.find({}).select("_id likes").lean();
        const likes = {};
        docs.forEach((d) => {
            likes[d._id.toString()] = typeof d.likes === "number" ? d.likes : 0;
        });
        res.json(likes);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Could not load like counts" });
    }
}

/**
 * POST /locations - Create location, redirect, send confirmation email.
 */
async function createLocation(req, res) {
    try {
        const name = req.body.name != null ? String(req.body.name) : "";
        const image = req.body.image != null ? String(req.body.image) : "";
        const description = req.body.description != null ? String(req.body.description) : "";
        const location = await Location.create({
            name,
            image,
            description,
            author: { id: req.user._id, username: req.user.username },
        });
        req.flash("success", "Location created successfully!");
        res.redirect("/locations");

        if (req.user.email) {
            sendLocationCreatedEmail(
                req.user.email,
                req.user.username,
                location.name,
                location._id.toString()
            ).catch((e) => console.error("Location-created email failed:", e));
        }
    } catch (err) {
        console.log(err);
        req.flash("error", "Could not create location");
        res.redirect("/locations");
    }
}

/**
 * POST /locations/upload-image - Upload file to ImageKit, return { url }.
 * Expects req.file (set by multer). Call after upload.single("image").
 */
async function uploadImage(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded. Choose an image file." });
    }
    try {
        const { url } = await uploadLocationImage(
            req.file.buffer,
            req.file.originalname || "image.jpg",
            req.file.mimetype
        );
        return res.json({ url });
    } catch (err) {
        console.error("ImageKit upload error:", err);
        const is403 = err.status === 403 || err.error?.message?.includes("cannot be authenticated");
        const message = is403
            ? "ImageKit authentication failed. Check .env: IMAGEKIT_PRIVATE_KEY, IMAGEKIT_PUBLIC_KEY, and IMAGEKIT_URL have no extra spaces or newlines, and match your ImageKit dashboard."
            : "Image upload failed. Try again or use an image URL instead.";
        return res.status(is403 ? 403 : 500).json({ error: message });
    }
}

/**
 * POST /locations/extract-image-from-link - Extract image URL from page (og:image / Google imgurl).
 */
async function extractImageFromLink(req, res) {
    const url = (req.body.url || "").trim();
    if (!url) {
        return res.status(400).json({ error: "Please paste a link." });
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return res.status(400).json({ error: "Link must start with http:// or https://" });
    }

    const googleImgUrl = getGoogleImagesImgUrl(url);
    if (googleImgUrl) return res.json({ imageUrl: googleImgUrl });

    if (!isUrlAllowedForFetch(url)) {
        return res.status(400).json({
            error: "This link is not allowed. Use a public web page or direct image URL.",
        });
    }

    const BROWSER_UA =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
        });
        clearTimeout(timeout);
        if (!response.ok) {
            return res.status(400).json({
                error: "Could not fetch the page. Check the link or try a direct image URL.",
            });
        }
        const html = await response.text();
        const $ = cheerio.load(html);
        let imageUrl =
            $('meta[property="og:image"]').attr("content") ||
            $('meta[name="twitter:image"]').attr("content") ||
            $('meta[property="twitter:image"]').attr("content");
        if (imageUrl?.startsWith("//")) {
            imageUrl = "https:" + imageUrl;
        }
        if (!imageUrl?.startsWith("http")) {
            return res.status(400).json({
                error: "No image found on this page. Try pasting a direct image URL instead.",
            });
        }
        return res.json({ imageUrl });
    } catch (err) {
        if (err.name === "AbortError") {
            return res.status(400).json({ error: "Request timed out. Try a different link." });
        }
        console.error("Extract image error:", err);
        return res
            .status(400)
            .json({ error: "Could not fetch the page. Try a direct image URL instead." });
    }
}

/**
 * GET /locations/:id - Show one location with populated comments.
 */
async function showLocation(req, res) {
    try {
        const foundLocation = await Location.findById(req.params.id).populate("comments");
        if (!foundLocation) {
            req.flash("error", "Location not found");
            return res.redirect("/locations");
        }
        res.render("locations/show", { location: foundLocation });
    } catch (err) {
        console.log(err);
        req.flash("error", "Location not found");
        res.redirect("/locations");
    }
}

/**
 * POST /locations/:id/like - Toggle like; responds JSON or redirect.
 */
async function likeLocation(req, res) {
    if (!req.isAuthenticated()) {
        if (req.accepts("json")) return res.status(401).json({ error: "Login required" });
        req.flash("error", "You need to be logged in to do that");
        return res.redirect("/login");
    }
    try {
        const location = await Location.findById(req.params.id);
        if (!location) {
            if (req.accepts("json")) return res.status(404).json({ error: "Location not found" });
            req.flash("error", "Location not found");
            return res.redirect("/locations");
        }

        if (!Array.isArray(location.likedBy)) {
            location.likedBy = [];
        }

        const userId = req.user._id;
        const alreadyLiked = location.likedBy.some((id) => id.equals(userId));

        if (alreadyLiked) {
            location.likedBy = location.likedBy.filter((id) => !id.equals(userId));
            location.likes = Math.max(0, (location.likes || 0) - 1);
        } else {
            location.likedBy.push(userId);
            location.likes = (location.likes || 0) + 1;
        }

        await location.save();

        if (req.accepts("json")) {
            return res.json({ likes: location.likes, liked: !alreadyLiked });
        }
        res.redirect(`/locations/${location._id}`);
    } catch (err) {
        console.log(err);
        if (req.accepts("json")) return res.status(500).json({ error: "Could not update likes" });
        req.flash("error", "Could not update likes");
        res.redirect("/locations");
    }
}

/**
 * GET /locations/:id/edit - Show edit form (after checkLocationOwnership).
 */
async function editLocationForm(req, res) {
    try {
        const foundLocation = await Location.findById(req.params.id);
        if (!foundLocation) {
            req.flash("error", "Location not found");
            return res.redirect("/locations");
        }
        res.render("locations/edit", { location: foundLocation });
    } catch (err) {
        console.log(err);
        req.flash("error", "Location not found");
        res.redirect("/locations");
    }
}

/**
 * PUT /locations/:id - Update location (whitelisted fields).
 */
async function updateLocation(req, res) {
    try {
        const group = req.body.group || {};
        const updateData = {
            name: group.name,
            image: group.image,
            description: group.description,
            updatedAt: new Date(),
        };
        await Location.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
        });
        req.flash("success", "Location updated successfully!");
        res.redirect("/locations/" + req.params.id);
    } catch (err) {
        console.log(err);
        req.flash("error", "Could not update location");
        res.redirect("/locations");
    }
}

/**
 * DELETE /locations/:id - Delete location.
 */
async function deleteLocation(req, res) {
    try {
        await Location.findByIdAndDelete(req.params.id);
        req.flash("success", "Location deleted successfully!");
        res.redirect("/locations");
    } catch (err) {
        console.log(err);
        req.flash("error", "Could not delete location");
        res.redirect("/locations");
    }
}

module.exports = {
    showAllLocations,
    apiLikes,
    createLocation,
    uploadImage,
    extractImageFromLink,
    showLocation,
    likeLocation,
    editLocationForm,
    updateLocation,
    deleteLocation,
};
