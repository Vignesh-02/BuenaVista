const {
    validateRegister,
    validateLogin,
    mapRegisterError,
    USERNAME_MIN,
    USERNAME_MAX,
    PASSWORD_MIN,
    PASSWORD_MAX,
} = require("../../utils/validation");

const validEmail = "user@example.com";

describe("validateRegister", () => {
    it("returns valid for correct username, email and password", () => {
        const result = validateRegister("validuser", validEmail, "password123");
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.username).toBe("validuser");
        expect(result.email).toBe(validEmail);
        expect(result.password).toBe("password123");
    });

    it("trims username, email and password", () => {
        const result = validateRegister("  user12  ", "  user@example.com  ", "  pass1234  ");
        expect(result.valid).toBe(true);
        expect(result.username).toBe("user12");
        expect(result.email).toBe("user@example.com");
        expect(result.password).toBe("pass1234");
    });

    it("rejects username shorter than 5 characters", () => {
        const result = validateRegister("user", validEmail, "password123");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(`Username must be at least ${USERNAME_MIN} characters.`);
    });

    it("rejects username longer than 30 characters", () => {
        const result = validateRegister("a".repeat(31), validEmail, "password123");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(`Username must be at most ${USERNAME_MAX} characters.`);
    });

    it("rejects username with special characters", () => {
        const result = validateRegister("user@name", validEmail, "password123");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
            "Username can only contain letters, numbers, and underscores (no spaces or special characters)."
        );
    });

    it("rejects username with spaces", () => {
        const result = validateRegister("user name", validEmail, "password123");
        expect(result.valid).toBe(false);
    });

    it("rejects invalid email", () => {
        const result = validateRegister("validuser", "notanemail", "password123");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Please enter a valid email address.");
    });

    it("rejects empty email", () => {
        const result = validateRegister("validuser", "", "password123");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Email is required.");
    });

    it("allows username with letters, numbers, and underscores", () => {
        expect(validateRegister("user_123", validEmail, "password123").valid).toBe(true);
        expect(validateRegister("User123", validEmail, "password123").valid).toBe(true);
    });

    it("rejects empty username", () => {
        const result = validateRegister("", validEmail, "password123");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Username is required.");
    });

    it("rejects password shorter than 8 characters", () => {
        const result = validateRegister("validuser", validEmail, "short");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(`Password must be at least ${PASSWORD_MIN} characters.`);
    });

    it("rejects password longer than 128 characters", () => {
        const result = validateRegister("validuser", validEmail, "a".repeat(129));
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(`Password must be at most ${PASSWORD_MAX} characters.`);
    });

    it("rejects empty password", () => {
        const result = validateRegister("validuser", validEmail, "");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Password is required.");
    });

    it("returns multiple errors when both username and password invalid", () => {
        const result = validateRegister("ab", "bad", "x");
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it("handles null/undefined username, email and password", () => {
        expect(validateRegister(null, validEmail, "password123").valid).toBe(false);
        expect(validateRegister(undefined, validEmail, "password123").valid).toBe(false);
        expect(validateRegister("validuser", null, "password123").valid).toBe(false);
        expect(validateRegister("validuser", validEmail, null).valid).toBe(false);
    });
});

describe("validateLogin", () => {
    it("returns valid when both username and password provided", () => {
        const result = validateLogin("user", "password");
        expect(result.valid).toBe(true);
    });

    it("returns invalid when username or email is empty", () => {
        const result = validateLogin("", "password");
        expect(result.valid).toBe(false);
        expect(result.message).toBe("Please enter your username or email and password.");
    });

    it("returns invalid when password is empty", () => {
        const result = validateLogin("user", "");
        expect(result.valid).toBe(false);
    });

    it("returns invalid when both are empty after trim", () => {
        const result = validateLogin("   ", "   ");
        expect(result.valid).toBe(false);
    });

    it("returns valid when username and password have content after trim", () => {
        const result = validateLogin("  user  ", "  pass  ");
        expect(result.valid).toBe(true);
    });
});

describe("mapRegisterError", () => {
    it("returns friendly message for duplicate username (11000)", () => {
        const err = { code: 11000, keyPattern: { username: 1 } };
        expect(mapRegisterError(err)).toBe(
            "That username is already taken. Please choose another."
        );
    });

    it("returns friendly message for duplicate email (11000)", () => {
        const err = { code: 11000, keyPattern: { email: 1 } };
        expect(mapRegisterError(err)).toBe(
            "That email is already registered. Sign in or use a different email."
        );
    });

    it("returns friendly message for ValidationError", () => {
        const err = {
            name: "ValidationError",
            errors: { username: { message: "Username too short" } },
        };
        expect(mapRegisterError(err)).toBe("Username too short");
    });

    it("returns err.message for ValidationError when no username error", () => {
        const err = { name: "ValidationError", message: "Validation failed" };
        expect(mapRegisterError(err)).toBe("Validation failed");
    });

    it("returns email error for ValidationError with email error", () => {
        const err = {
            name: "ValidationError",
            errors: { email: { message: "Invalid email" } },
        };
        expect(mapRegisterError(err)).toBe("Invalid email");
    });

    it("returns friendly message for UserExistsError in message", () => {
        const err = {
            message: "A user with the given username (UserExistsError) is already registered",
        };
        expect(mapRegisterError(err)).toBe(
            "That username is already taken. Please choose another."
        );
    });

    it("returns err.message for unknown errors", () => {
        const err = new Error("Database connection failed");
        expect(mapRegisterError(err)).toBe("Database connection failed");
    });

    it("returns fallback when err.message is missing", () => {
        expect(mapRegisterError({})).toBe("Something went wrong. Please try again.");
    });
});
