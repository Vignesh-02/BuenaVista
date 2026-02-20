const Location = require("../models/location");
const Comment = require("../models/comment");

// All middleware goes here
const middlewareObj = {};

middlewareObj.checkLocationOwnership = async (req, res, next) => {
    if (req.isAuthenticated()) {
        try {
            const foundLocation = await Location.findById(req.params.id);
            if (!foundLocation) {
                req.flash("error", "Location not found");
                return res.redirect("back");
            }
            // Does user own the location? (author may be { id, username } or legacy ObjectId)
            const authorId = foundLocation.author && (foundLocation.author.id || foundLocation.author);
            if (authorId && authorId.equals(req.user._id)) {
                next();
            } else {
                req.flash("error", "You don't have permission to do that");
                res.redirect("back");
            }
        } catch (err) {
            console.log(err);
            req.flash("error", "Location not found");
            res.redirect("back");
        }
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("/login");
    }
};

middlewareObj.checkCommentOwnership = async (req, res, next) => {
    if (req.isAuthenticated()) {
        try {
            const foundComment = await Comment.findById(req.params.comment_id);
            if (!foundComment) {
                req.flash("error", "Comment not found");
                return res.redirect("back");
            }
            // Does user own the comment? (author may be { id, username } or legacy ObjectId)
            const authorId = foundComment.author && (foundComment.author.id || foundComment.author);
            if (authorId && authorId.equals(req.user._id)) {
                next();
            } else {
                req.flash("error", "You don't have permission to do that");
                res.redirect("back");
            }
        } catch (err) {
            console.log(err);
            req.flash("error", "Comment not found");
            res.redirect("back");
        }
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("/login");
    }
};

middlewareObj.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "You need to be logged in to do that");
    res.redirect("/login");
};

module.exports = middlewareObj;
