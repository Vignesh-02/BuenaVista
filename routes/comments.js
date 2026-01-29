const express = require("express");
const router = express.Router({ mergeParams: true });
const Location = require("../models/location");
const Comment = require("../models/comment");
const middleware = require("../middleware");

// Comments New
router.get("/new", middleware.isLoggedIn, async (req, res) => {
    try {
        const location = await Location.findById(req.params.id);
        if (!location) {
            req.flash("error", "Location not found");
            return res.redirect("/locations");
        }
        res.render("comments/new", { location });
    } catch (err) {
        console.log(err);
        req.flash("error", "Location not found");
        res.redirect("/locations");
    }
});

// Comments Create
router.post("/", middleware.isLoggedIn, async (req, res) => {
    try {
        const location = await Location.findById(req.params.id);
        if (!location) {
            req.flash("error", "Location not found");
            return res.redirect("/locations");
        }
        
        const comment = await Comment.create(req.body.comment);
        // Add username and id to comment
        comment.author.id = req.user._id;
        comment.author.username = req.user.username;
        await comment.save();
        
        location.comments.push(comment);
        await location.save();
        
        req.flash("success", "Comment added successfully!");
        res.redirect("/locations/" + location._id);
    } catch (err) {
        console.log(err);
        req.flash("error", "Something went wrong");
        res.redirect("/locations");
    }
});

// COMMENT EDIT ROUTE
router.get("/:comment_id/edit", middleware.checkCommentOwnership, async (req, res) => {
    try {
        const foundComment = await Comment.findById(req.params.comment_id);
        if (!foundComment) {
            req.flash("error", "Comment not found");
            return res.redirect("back");
        }
        res.render("comments/edit", { location_id: req.params.id, comment: foundComment });
    } catch (err) {
        console.log(err);
        req.flash("error", "Comment not found");
        res.redirect("back");
    }
});

// COMMENT UPDATE
router.put("/:comment_id", middleware.checkCommentOwnership, async (req, res) => {
    try {
        await Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment);
        req.flash("success", "Comment updated successfully!");
        res.redirect("/locations/" + req.params.id);
    } catch (err) {
        console.log(err);
        req.flash("error", "Could not update comment");
        res.redirect("back");
    }
});

// COMMENT DESTROY ROUTE
router.delete("/:comment_id", middleware.checkCommentOwnership, async (req, res) => {
    try {
        await Comment.findByIdAndDelete(req.params.comment_id);
        req.flash("success", "Comment deleted successfully!");
        res.redirect("/locations/" + req.params.id);
    } catch (err) {
        console.log(err);
        req.flash("error", "Could not delete comment");
        res.redirect("back");
    }
});

module.exports = router;
