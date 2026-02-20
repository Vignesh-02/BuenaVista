const express = require("express");
const router = express.Router();
const middleware = require("../middleware");
const uploadMiddleware = require("../middleware/upload");
const locationsController = require("../controllers/locationsController");

// INDEX - show all locations
router.get("/", locationsController.showAllLocations);

// API: like counts for all locations
router.get("/api/likes", locationsController.apiLikes);

// CREATE - add new location to db
router.post("/", middleware.isLoggedIn, locationsController.createLocation);

// Upload location image to ImageKit (images only, max 5MB)
router.post(
    "/upload-image",
    middleware.isLoggedIn,
    uploadMiddleware.upload.single("image"),
    uploadMiddleware.handleUploadError,
    locationsController.uploadImage
);

// Extract image URL from a page link (Google Images imgurl, og:image, etc.)
router.post("/extract-image-from-link", middleware.isLoggedIn, locationsController.extractImageFromLink);

// NEW - display form to create new location
router.get("/new", middleware.isLoggedIn, (req, res) => {
    res.render("locations/new.ejs");
});

// SHOW - one location with comments
router.get("/:id", locationsController.showLocation);

// LIKE - toggle like
router.post("/:id/like", locationsController.likeLocation);

// EDIT - show edit form (after ownership check)
router.get("/:id/edit", middleware.checkLocationOwnership, locationsController.editLocationForm);

// UPDATE
router.put("/:id", middleware.checkLocationOwnership, locationsController.updateLocation);

// DESTROY
router.delete("/:id", middleware.checkLocationOwnership, locationsController.deleteLocation);

module.exports = router;
