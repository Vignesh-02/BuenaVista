const express = require("express");
const router = express.Router();
const passport = require("passport");
const authController = require("../controllers/authController");

// Root route
router.get("/", (req, res) => {
    res.render("landing");
});

// Show register form
router.get("/register", (req, res) => {
    res.render("register");
});

// Handle user sign up
router.post("/register", authController.registerUser);

// Show login form
router.get("/login", (req, res) => {
    res.render("login");
});

// Handle login: validate → passport.authenticate → success handler
router.post(
    "/login",
    authController.validateLoginMiddleware,
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: {
            type: "error",
            message: "Invalid username/email or password. Please try again.",
        },
    }),
    authController.loginSuccess
);

// Logout - destroy session and redirect
router.get("/logout", authController.logout);

module.exports = router;
