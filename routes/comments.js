const express = require("express");
const router = express.Router({ mergeParams: true });
const middleware = require("../middleware");
const commentsController = require("../controllers/commentsController");

// NEW - show new comment form
router.get("/new", middleware.isLoggedIn, commentsController.newCommentForm);

// CREATE
router.post("/", middleware.isLoggedIn, commentsController.createComment);

// EDIT - show edit form (after ownership check)
router.get(
    "/:comment_id/edit",
    middleware.checkCommentOwnership,
    commentsController.editCommentForm
);

// UPDATE
router.put("/:comment_id", middleware.checkCommentOwnership, commentsController.updateComment);

// DESTROY
router.delete("/:comment_id", middleware.checkCommentOwnership, commentsController.deletComment);

module.exports = router;
