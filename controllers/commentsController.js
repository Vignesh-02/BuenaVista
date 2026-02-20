/**
 * Comments controller: new form, create, edit form, update, destroy.
 */
const Location = require("../models/location");
const Comment = require("../models/comment");
const User = require("../models/user");
const { sendCommentNotificationEmail } = require("../lib/email");

/**
 * GET /locations/:id/comments/new - Show new comment form.
 */
async function newCommentForm(req, res) {
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
}

/**
 * POST /locations/:id/comments - Create comment, notify post author if applicable.
 */
async function createComment(req, res) {
    try {
        const location = await Location.findById(req.params.id);
        if (!location) {
            req.flash("error", "Location not found");
            return res.redirect("/locations");
        }

        const comment = await Comment.create(req.body.comment);
        comment.author.id = req.user._id;
        comment.author.username = req.user.username;
        await comment.save();

        location.comments.push(comment);
        await location.save();

        const authorId = location.author && (location.author.id || location.author);
        const isOwnPost = authorId && authorId.toString() === req.user._id.toString();
        if (!isOwnPost && authorId) {
            const authorUser = await User.findById(authorId).select("email username").lean();
            if (authorUser && authorUser.email) {
                sendCommentNotificationEmail(
                    authorUser.email,
                    authorUser.username || location.author?.username,
                    location.name,
                    location._id.toString(),
                    req.user.username,
                    comment.text
                ).catch((e) => console.error("Comment-notification email failed:", e));
            }
        }

        req.flash("success", "Comment added successfully!");
        res.redirect("/locations/" + location._id);
    } catch (err) {
        console.log(err);
        req.flash("error", "Something went wrong");
        res.redirect("/locations");
    }
}

/**
 * GET /locations/:id/comments/:comment_id/edit - Show edit comment form.
 */
async function editCommentForm(req, res) {
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
}

/**
 * PUT /locations/:id/comments/:comment_id - Update comment.
 */
async function updateComment(req, res) {
    try {
        await Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment);
        req.flash("success", "Comment updated successfully!");
        res.redirect("/locations/" + req.params.id);
    } catch (err) {
        console.log(err);
        req.flash("error", "Could not update comment");
        res.redirect("back");
    }
}

/**
 * DELETE /locations/:id/comments/:comment_id - Delete comment.
 */
async function deletComment(req, res) {
    try {
        await Comment.findByIdAndDelete(req.params.comment_id);
        req.flash("success", "Comment deleted successfully!");
        res.redirect("/locations/" + req.params.id);
    } catch (err) {
        console.log(err);
        req.flash("error", "Could not delete comment");
        res.redirect("back");
    }
}

module.exports = {
    newCommentForm,
    createComment,
    editCommentForm,
    updateComment,
    deletComment,
};
