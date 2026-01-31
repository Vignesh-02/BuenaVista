/**
 * Frontend / smoke tests: key pages return 200 and contain expected content.
 * No DB writes; only GET requests to verify pages render.
 */
const request = require("supertest");

let app;

beforeAll(async () => {
    await global.mongoPromise;
    const mod = require("../../app");
    app = mod.app;
    const connectDB = require("../../db");
    await connectDB();
}, 20000);

afterAll(async () => {
    const mongoose = require("mongoose");
    await mongoose.disconnect();
});

describe("Pages (frontend smoke)", () => {
    it("GET / returns 200 and contains BuenaVista branding", async () => {
        const res = await request(app).get("/");
        expect(res.status).toBe(200);
        expect(res.text).toMatch(/BuenaVista/i);
    });

    it("GET /register returns 200 and Create Account / username / password", async () => {
        const res = await request(app).get("/register");
        expect(res.status).toBe(200);
        expect(res.text).toMatch(/Create Account|Sign Up/i);
        expect(res.text).toMatch(/username|Username/i);
        expect(res.text).toMatch(/password|Password/i);
    });

    it("GET /login returns 200 and Sign In form", async () => {
        const res = await request(app).get("/login");
        expect(res.status).toBe(200);
        expect(res.text).toMatch(/Sign In|Welcome Back/i);
        expect(res.text).toMatch(/username|password/i);
    });

    it("GET /locations returns 200", async () => {
        const res = await request(app).get("/locations");
        expect(res.status).toBe(200);
    });

    it("GET /locations/new redirects to login when not authenticated", async () => {
        const res = await request(app).get("/locations/new");
        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/\/login/);
    });
});
