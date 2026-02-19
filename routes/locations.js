const express = require("express");
const router = express.Router();
const multer = require("multer");
const cheerio = require("cheerio");
const Location = require("../models/location");
const middleware = require("../middleware");
const { uploadLocationImage } = require("../lib/imagekit");

// Max 5MB for location images (good balance for quality vs load time)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_SIZE },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only images are allowed (JPEG, PNG, GIF, WebP). Videos and other files are not allowed."), false);
        }
    },
});

// INDEX - show all locations (no HTML cache so flash messages are only shown once)
router.get("/", async (req, res) => {
    try {
        res.set("Cache-Control", "private, no-store");
        const allLocations = await Location.find({});
        res.render("locations/index", { locations: allLocations });
    } catch (err) {
        console.log(err);
        req.flash("error", "Something went wrong");
        res.redirect("/");
    }
});

// API: like counts for all locations (no cache so list page can show fresh counts)
router.get("/api/likes", async (req, res) => {
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
});

// CREATE - add new location to db
router.post("/", middleware.isLoggedIn, async (req, res) => {
    try {
        const name = req.body.name;
        const image = req.body.image;
        const desc = req.body.description;
        const author = {
            id: req.user._id,
            username: req.user.username,
        };
        const newLocation = { name, image, description: desc, author };

        await Location.create(newLocation);
        req.flash("success", "Location created successfully!");
        res.redirect("/locations");
    } catch (err) {
        console.log(err);
        req.flash("error", "Could not create location");
        res.redirect("/locations");
    }
});

// Upload location image to ImageKit (images only, max 5MB)
router.post(
    "/upload-image",
    middleware.isLoggedIn,
    upload.single("image"),
    async (req, res) => {
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
            const is403 = err.status === 403 || (err.error && err.error.message && err.error.message.includes("cannot be authenticated"));
            const message = is403
                ? "ImageKit authentication failed. Check .env: IMAGEKIT_PRIVATE_KEY, IMAGEKIT_PUBLIC_KEY, and IMAGEKIT_URL have no extra spaces or newlines, and match your ImageKit dashboard."
                : "Image upload failed. Try again or use an image URL instead.";
            return res.status(is403 ? 403 : 500).json({ error: message });
        }
    },
    (err, req, res, next) => {
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "Image is too large. Maximum size is 5 MB." });
        }
        if (err.message && err.message.includes("Only images are allowed")) {
            return res.status(400).json({ error: err.message });
        }
        next(err);
    }
);

// Extract image URL from a page link. Handles Google Images "Copy link" (imgurl param), and other sites (og:image).
router.post("/extract-image-from-link", middleware.isLoggedIn, async (req, res) => {
    const url = (req.body.url || "").trim();
    if (!url) {
        return res.status(400).json({ error: "Please paste a link." });
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return res.status(400).json({ error: "Link must start with http:// or https://" });
    }

    // Google Images "Copy link" - URL has imgurl param with the actual image. No fetch needed.
    try {
        const parsed = new URL(url);
        if ((parsed.hostname === "www.google.com" || parsed.hostname === "google.com") && parsed.pathname.includes("/imgres")) {
            const imgurl = parsed.searchParams.get("imgurl");
            if (imgurl && (imgurl.startsWith("http://") || imgurl.startsWith("https://"))) {
                return res.json({ imageUrl: imgurl });
            }
        }
    } catch (e) {
        // Not a valid URL, continue to fetch flow
    }

    // Generic: fetch page and parse og:image / twitter:image
    const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
        });
        clearTimeout(timeout);
        if (!response.ok) {
            return res.status(400).json({ error: "Could not fetch the page. Check the link or try a direct image URL." });
        }
        const html = await response.text();
        const $ = cheerio.load(html);
        let imageUrl =
            $('meta[property="og:image"]').attr("content") ||
            $('meta[name="twitter:image"]').attr("content") ||
            $('meta[property="twitter:image"]').attr("content");
        if (imageUrl && imageUrl.startsWith("//")) {
            imageUrl = "https:" + imageUrl;
        }
        if (!imageUrl || !imageUrl.startsWith("http")) {
            return res.status(400).json({ error: "No image found on this page. Try pasting a direct image URL instead." });
        }
        return res.json({ imageUrl });
    } catch (err) {
        if (err.name === "AbortError") {
            return res.status(400).json({ error: "Request timed out. Try a different link." });
        }
        console.error("Extract image error:", err);
        return res.status(400).json({ error: "Could not fetch the page. Try a direct image URL instead." });
    }
});

// NEW - display form to create new location
router.get("/new", middleware.isLoggedIn, (req, res) => {
    res.render("locations/new.ejs");
});

// SHOW - shows more info about one location
router.get("/:id", async (req, res) => {
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
});

// LIKE - toggle like for a location and keep a counter in the DB
router.post("/:id/like", async (req, res) => {
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
});

// EDIT LOCATION ROUTE
router.get("/:id/edit", middleware.checkLocationOwnership, async (req, res) => {
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
});

// UPDATE LOCATION ROUTE
router.put("/:id", middleware.checkLocationOwnership, async (req, res) => {
    try {
        // Add updatedAt timestamp and use new:true to get updated doc
        const updateData = {
            ...req.body.group,
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
});

// DESTROY LOCATION ROUTE
router.delete("/:id", middleware.checkLocationOwnership, async (req, res) => {
    try {
        await Location.findByIdAndDelete(req.params.id);
        req.flash("success", "Location deleted successfully!");
        res.redirect("/locations");
    } catch (err) {
        console.log(err);
        req.flash("error", "Could not delete location");
        res.redirect("/locations");
    }
});

module.exports = router;
