const express = require("express");
const router = express.Router();
const Location = require("../models/location");
const middleware = require("../middleware");

// INDEX - show all locations
router.get("/", async (req, res) => {
    try {
        const allLocations = await Location.find({});
        res.render("locations/index", { locations: allLocations });
    } catch (err) {
        console.log(err);
        req.flash("error", "Something went wrong");
        res.redirect("/");
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
            username: req.user.username
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
            updatedAt: new Date()
        };
        await Location.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
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
