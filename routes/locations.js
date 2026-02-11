const express = require("express");
const router = express.Router();
const Location = require("../models/location");
const middleware = require("../middleware");

// INDEX - show all locations (cacheable; like counts are refreshed via JS from /locations/api/likes)
router.get("/", async (req, res) => {
    try {
        res.set("Cache-Control", "public, max-age=300");
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
