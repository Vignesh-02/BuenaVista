/**
 * Registration and login validation helpers.
 * Username: 5–30 chars, letters, numbers, underscores only.
 * Password: 8–128 chars.
 */

const USERNAME_MIN = 5;
const USERNAME_MAX = 30;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

function validateRegister(username, password) {
    const errors = [];
    const trimmedUsername = (username || "").trim();
    const trimmedPassword = (password || "").trim();

    if (!trimmedUsername) {
        errors.push("Username is required.");
    } else {
        if (trimmedUsername.length < USERNAME_MIN) {
            errors.push(`Username must be at least ${USERNAME_MIN} characters.`);
        }
        if (trimmedUsername.length > USERNAME_MAX) {
            errors.push(`Username must be at most ${USERNAME_MAX} characters.`);
        }
        if (!USERNAME_REGEX.test(trimmedUsername)) {
            errors.push("Username can only contain letters, numbers, and underscores (no spaces or special characters).");
        }
    }

    if (!trimmedPassword) {
        errors.push("Password is required.");
    } else {
        if (trimmedPassword.length < PASSWORD_MIN) {
            errors.push(`Password must be at least ${PASSWORD_MIN} characters.`);
        }
        if (trimmedPassword.length > PASSWORD_MAX) {
            errors.push(`Password must be at most ${PASSWORD_MAX} characters.`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        username: trimmedUsername,
        password: trimmedPassword,
    };
}

function validateLogin(username, password) {
    const trimmedUsername = (username || "").trim();
    const trimmedPassword = (password || "").trim();

    if (!trimmedUsername || !trimmedPassword) {
        return {
            valid: false,
            message: "Please enter both username and password.",
        };
    }
    return { valid: true };
}

module.exports = {
    validateRegister,
    validateLogin,
    USERNAME_MIN,
    USERNAME_MAX,
    PASSWORD_MIN,
    PASSWORD_MAX,
};
