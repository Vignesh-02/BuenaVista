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
router.post("/register", async (req, res, next) => {
    try {
        const newUser = new User({ username: req.body.username });
        const user = await User.register(newUser, req.body.password);

        req.login(user, (err) => {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("/register");
            }
            req.flash("success", "Welcome to BuenaVista, " + user.username + "!");
            // Save session to MongoStore before redirect so passport data is persisted
            req.session.save((saveErr) => {
                if (saveErr) return next(saveErr);
                res.redirect("/locations");
            });
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
}), (req, res, next) => {
    req.flash("success", "Welcome back, " + req.user.username + "!");
    req.session.save((err) => {
        if (err) return next(err);
        res.redirect("/locations");
    });
});

// Logout route
router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "You have been logged out!");
        req.session.save((saveErr) => {
            if (saveErr) return next(saveErr);
            res.redirect("/locations");
        });
    });
});

module.exports = router;
