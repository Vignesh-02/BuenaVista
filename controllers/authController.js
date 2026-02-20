/**
 * Auth controller: registration, login success, logout.
 */
const User = require("../models/user");
const { validateRegister, validateLogin, mapRegisterError } = require("../utils/validation");
const { sendOnboardingEmail } = require("../lib/email");

/**
 * POST /register - Create user, log in, send onboarding email.
 */
async function registerUser(req, res, next) {
    const validation = validateRegister(req.body.username, req.body.email, req.body.password);

    if (!validation.valid) {
        req.flash("error", validation.errors.join(" "));
        return res.redirect("/register");
    }

    try {
        const newUser = new User({ username: validation.username, email: validation.email });
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

        if (user.email) {
            sendOnboardingEmail(user.email, user.username).catch((e) =>
                console.error("Onboarding email failed:", e)
            );
        }
    } catch (err) {
        console.log(err);
        const message = mapRegisterError(err);
        req.flash("error", message);
        res.redirect("/register");
    }
}

/**
 * Pre-login validation middleware. Use before passport.authenticate.
 * Redirects to /login with flash if invalid.
 */
function validateLoginMiddleware(req, res, next) {
    const loginValidation = validateLogin(req.body.usernameOrEmail, req.body.password);
    if (!loginValidation.valid) {
        req.flash("error", loginValidation.message);
        return res.redirect("/login");
    }
    next();
}

/**
 * POST /login success handler (after passport.authenticate).
 */
function loginSuccess(req, res, next) {
    req.flash("success", "Welcome back, " + req.user.username + "!");
    req.session.save((err) => {
        if (err) return next(err);
        res.redirect("/locations");
    });
}

/**
 * GET /logout - Destroy session and redirect.
 */
function logout(req, res, next) {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.session.destroy((destroyErr) => {
            if (destroyErr) return next(destroyErr);
            res.redirect("/locations?logged_out=1");
        });
    });
}

module.exports = {
    registerUser,
    validateLoginMiddleware,
    loginSuccess,
    logout,
};
