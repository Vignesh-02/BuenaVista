const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const { validateRegister, validateLogin } = require("../utils/validation");

// Map mongoose/passport errors to user-friendly messages
function mapRegisterError(err) {
    if (err.code === 11000) {
        return "That username is already taken. Please choose another.";
    }
    if (err.name === "ValidationError") {
        const msg = err.errors?.username?.message || err.message;
        return msg;
    }
    if (err.message && err.message.includes("UserExistsError")) {
        return "That username is already taken. Please choose another.";
    }
    return err.message || "Something went wrong. Please try again.";
}

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
    const validation = validateRegister(req.body.username, req.body.password);

    if (!validation.valid) {
        req.flash("error", validation.errors.join(" "));
        return res.redirect("/register");
    }

    try {
        const newUser = new User({ username: validation.username });
        const user = await User.register(newUser, validation.password);

        req.login(user, (err) => {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("/register");
            }
            req.flash("success", "Welcome to BuenaVista, " + user.username + "!");
            req.session.save((saveErr) => {
                if (saveErr) return next(saveErr);
                res.redirect("/locations");
            });
        });
    } catch (err) {
        console.log(err);
        const message = mapRegisterError(err);
        req.flash("error", message);
        res.redirect("/register");
    }
});

// Show login form
router.get("/login", (req, res) => {
    res.render("login");
});

// Handle login logic
router.post("/login", (req, res, next) => {
    const loginValidation = validateLogin(req.body.username, req.body.password);
    if (!loginValidation.valid) {
        req.flash("error", loginValidation.message);
        return res.redirect("/login");
    }
    next();
}, passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: { type: "error", message: "Invalid username or password. Please try again." }
}), (req, res, next) => {
    req.flash("success", "Welcome back, " + req.user.username + "!");
    req.session.save((err) => {
        if (err) return next(err);
        res.redirect("/locations");
    });
});

// Logout route - destroy session in MongoStore and clear cookie
router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.session.destroy((destroyErr) => {
            if (destroyErr) return next(destroyErr);
            res.redirect("/locations?logged_out=1");
        });
    });
});

module.exports = router;
