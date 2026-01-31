const request = require("supertest");
const mongoose = require("mongoose");
const User = require("../../models/user");

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
        it("returns 200 and registration form", async () => {
            const res = await request(app).get("/register");
            expect(res.status).toBe(200);
            expect(res.text).toMatch(/Create Account|Sign Up|username|password/i);
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
                .send({ username: "ab", password: "password123" });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/register");
        });

        it("redirects to /register with error when password too short", async () => {
            const res = await request(app)
                .post("/register")
                .type("form")
                .send({ username: "validuser", password: "short" });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/register");
        });

        it("redirects to /register with error when username has special characters", async () => {
            const res = await request(app)
                .post("/register")
                .type("form")
                .send({ username: "user@name", password: "password123" });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/register");
        });

        it("registers valid user and redirects to /locations", async () => {
            const username = `testuser_${Date.now()}`;
            const res = await request(app)
                .post("/register")
                .type("form")
                .send({ username, password: "password123" });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/locations");
            const user = await User.findOne({ username });
            expect(user).not.toBeNull();
        });
    });

    describe("POST /login", () => {
        it("redirects to /login with error when username empty", async () => {
            const res = await request(app)
                .post("/login")
                .type("form")
                .send({ username: "", password: "password123" });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/login");
        });

        it("redirects to /login with error when password empty", async () => {
            const res = await request(app)
                .post("/login")
                .type("form")
                .send({ username: "someone", password: "" });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/login");
        });

        it("redirects to /login with error when credentials invalid", async () => {
            const res = await request(app)
                .post("/login")
                .type("form")
                .send({ username: "nonexistentuser12345", password: "wrongpass" });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/login");
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
