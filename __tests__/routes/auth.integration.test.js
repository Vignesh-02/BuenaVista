const request = require("supertest");
const mongoose = require("mongoose");
const User = require("../../models/user");

jest.mock("../../lib/email", () => ({
    sendOnboardingEmail: jest.fn().mockResolvedValue(undefined),
}));

const emailLib = require("../../lib/email");

let app;

beforeAll(async () => {
    await global.mongoPromise;
    const mod = require("../../app");
    app = mod.app;
    const connectDB = require("../../db");
    await connectDB();
}, 20000);

afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
});

describe("Auth routes (integration)", () => {
    describe("GET /", () => {
        it("returns 200 and landing page", async () => {
            const res = await request(app).get("/");
            expect(res.status).toBe(200);
            expect(res.text).toMatch(/BuenaVista|Discover|explorers/i);
        });
    });

    describe("GET /register", () => {
        it("returns 200 and registration form with username, email, password", async () => {
            const res = await request(app).get("/register");
            expect(res.status).toBe(200);
            expect(res.text).toMatch(/Create Account|Sign Up|username|password/i);
            expect(res.text).toMatch(/email|Email/i);
            expect(res.text).toMatch(/name="username"/);
            expect(res.text).toMatch(/name="email"/);
        });
    });

    describe("GET /login", () => {
        it("returns 200 and login form", async () => {
            const res = await request(app).get("/login");
            expect(res.status).toBe(200);
            expect(res.text).toMatch(/Welcome Back|Sign In|username|password/i);
        });
    });

    describe("POST /register", () => {
        it("redirects to /register with error when username too short", async () => {
            const res = await request(app)
                .post("/register")
                .type("form")
                .send({ username: "ab", email: "test@example.com", password: "password123" });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/register");
        });

        it("redirects to /register with error when password too short", async () => {
            const res = await request(app)
                .post("/register")
                .type("form")
                .send({ username: "validuser", email: "test@example.com", password: "short" });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/register");
        });

        it("redirects to /register with error when username has special characters", async () => {
            const res = await request(app).post("/register").type("form").send({
                username: "user@name",
                email: "test@example.com",
                password: "password123",
            });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/register");
        });

        it("registers valid user and redirects to /locations", async () => {
            const username = `testuser_${Date.now()}`;
            const email = `testuser_${Date.now()}@example.com`;
            const res = await request(app)
                .post("/register")
                .type("form")
                .send({ username, email, password: "password123" });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/locations");
            const user = await User.findOne({ username });
            expect(user).not.toBeNull();
            expect(user.email).toBe(email);
        });

        it("calls sendOnboardingEmail on successful registration", async () => {
            emailLib.sendOnboardingEmail.mockClear();
            const username = `onboard_${Date.now()}`;
            const email = `onboard_${Date.now()}@example.com`;
            await request(app)
                .post("/register")
                .type("form")
                .send({ username, email, password: "password123" });
            expect(emailLib.sendOnboardingEmail).toHaveBeenCalledWith(email, username);
        });

        it("redirects to /register when email is invalid", async () => {
            const res = await request(app)
                .post("/register")
                .type("form")
                .send({ username: "validuser", email: "notanemail", password: "password123" });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/register");
        });

        it("redirects to /register when email is missing", async () => {
            const res = await request(app)
                .post("/register")
                .type("form")
                .send({ username: "validuser", password: "password123" });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/register");
        });
    });

    describe("POST /login", () => {
        it("redirects to /login with error when usernameOrEmail empty", async () => {
            const res = await request(app)
                .post("/login")
                .type("form")
                .send({ usernameOrEmail: "", password: "password123" });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/login");
        });

        it("redirects to /login with error when password empty", async () => {
            const res = await request(app)
                .post("/login")
                .type("form")
                .send({ usernameOrEmail: "someone", password: "" });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/login");
        });

        it("redirects to /login with error when credentials invalid", async () => {
            const res = await request(app)
                .post("/login")
                .type("form")
                .send({ usernameOrEmail: "nonexistentuser12345", password: "wrongpass" });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/login");
        });

        it("logs in with email when user registered with email", async () => {
            const username = `emailuser_${Date.now()}`;
            const email = `emailuser_${Date.now()}@example.com`;
            await request(app)
                .post("/register")
                .type("form")
                .send({ username, email, password: "password123" });
            const res = await request(app)
                .post("/login")
                .type("form")
                .send({ usernameOrEmail: email, password: "password123" });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/locations");
        });
    });

    describe("GET /logout", () => {
        it("redirects to /locations with logged_out param", async () => {
            const res = await request(app).get("/logout");
            expect(res.status).toBe(302);
            expect(res.headers.location).toMatch(/\/locations\?logged_out=1/);
        });
    });
});
