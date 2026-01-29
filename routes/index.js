const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");

// Root route
router.get("/", (req, res) => {
    res.render("landing");
});

// Show register form
router.get("/register", (req, res) => {
    res.render("register");
});

// Handle user sign up
router.post("/register", async (req, res) => {
    try {
        const newUser = new User({ username: req.body.username });
        const user = await User.register(newUser, req.body.password);
        
        passport.authenticate("local")(req, res, () => {
            req.flash("success", "Welcome to BuenaVista, " + user.username + "!");
            res.redirect("/locations");
        });
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        res.redirect("/register");
    }
});

// Show login form
router.get("/login", (req, res) => {
    res.render("login");
});

// Handle login logic
router.post("/login", passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: { type: "error", message: "Invalid username or password" }
}), (req, res) => {
    req.flash("success", "Welcome back, " + req.user.username + "!");
    res.redirect("/locations");
});

// Logout route
router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "You have been logged out!");
        res.redirect("/locations");
    });
});

module.exports = router;
