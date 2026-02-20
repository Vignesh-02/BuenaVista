/**
 * Registration and login validation helpers.
 * Username: 5–30 chars, letters, numbers, underscores only.
 * Email: valid format (validator.isEmail).
 * Password: 8–128 chars.
 */

const validator = require("validator");
const USERNAME_MIN = 5;
const USERNAME_MAX = 30;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

function getUsernameRegisterErrors(trimmed) {
    const errs = [];
    if (!trimmed) {
        errs.push("Username is required.");
        return errs;
    }
    if (trimmed.length < USERNAME_MIN)
        errs.push(`Username must be at least ${USERNAME_MIN} characters.`);
    if (trimmed.length > USERNAME_MAX)
        errs.push(`Username must be at most ${USERNAME_MAX} characters.`);
    if (!USERNAME_REGEX.test(trimmed)) {
        errs.push(
            "Username can only contain letters, numbers, and underscores (no spaces or special characters)."
        );
    }
    return errs;
}

function getEmailRegisterErrors(trimmed) {
    if (!trimmed) return ["Email is required."];
    if (!validator.isEmail(trimmed)) return ["Please enter a valid email address."];
    return [];
}

function getPasswordRegisterErrors(trimmed) {
    const errs = [];
    if (!trimmed) {
        errs.push("Password is required.");
        return errs;
    }
    if (trimmed.length < PASSWORD_MIN)
        errs.push(`Password must be at least ${PASSWORD_MIN} characters.`);
    if (trimmed.length > PASSWORD_MAX)
        errs.push(`Password must be at most ${PASSWORD_MAX} characters.`);
    return errs;
}

function validateRegister(username, email, password) {
    const trimmedUsername = (username || "").trim();
    const trimmedEmail = (email || "").trim().toLowerCase();
    const trimmedPassword = (password || "").trim();
    const errors = [
        ...getUsernameRegisterErrors(trimmedUsername),
        ...getEmailRegisterErrors(trimmedEmail),
        ...getPasswordRegisterErrors(trimmedPassword),
    ];
    return {
        valid: errors.length === 0,
        errors,
        username: trimmedUsername,
        email: trimmedEmail,
        password: trimmedPassword,
    };
}

function validateLogin(usernameOrEmail, password) {
    const trimmed = (usernameOrEmail || "").trim();
    const trimmedPassword = (password || "").trim();

    if (!trimmed || !trimmedPassword) {
        return {
            valid: false,
            message: "Please enter your username or email and password.",
        };
    }
    return { valid: true };
}

function mapRegisterError(err) {
    if (err.code === 11000) {
        const key = err.keyPattern?.email ? "email" : "username";
        return key === "email"
            ? "That email is already registered. Sign in or use a different email."
            : "That username is already taken. Please choose another.";
    }
    if (err.name === "ValidationError") {
        const msg = err.errors?.username?.message || err.errors?.email?.message || err.message;
        return msg;
    }
    if (err.message && err.message.includes("UserExistsError")) {
        return "That username is already taken. Please choose another.";
    }
    return err.message || "Something went wrong. Please try again.";
}

module.exports = {
    validateRegister,
    validateLogin,
    mapRegisterError,
    USERNAME_MIN,
    USERNAME_MAX,
    PASSWORD_MIN,
    PASSWORD_MAX,
    isEmail: validator.isEmail,
};
