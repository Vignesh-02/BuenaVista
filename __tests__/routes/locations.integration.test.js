const request = require("supertest");
const mongoose = require("mongoose");
const User = require("../../models/user");
const Location = require("../../models/location");

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
    await Location.deleteMany({});
    await mongoose.disconnect();
});

describe("Locations routes (integration)", () => {
    describe("GET /locations", () => {
        it("returns 200 and locations index page", async () => {
            const res = await request(app).get("/locations");
            expect(res.status).toBe(200);
            expect(res.text).toMatch(/Locations|locations/i);
        });

        it("returns 200 when locations list is empty", async () => {
            await Location.deleteMany({});
            const res = await request(app).get("/locations");
            expect(res.status).toBe(200);
        });
    });

    describe("GET /locations/api/likes", () => {
        it("returns 200 and JSON with location id to likes mapping", async () => {
            const res = await request(app).get("/locations/api/likes");
            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toMatch(/json/);
            expect(res.body).toBeDefined();
            expect(typeof res.body).toBe("object");
        });

        it("includes like counts for existing locations", async () => {
            const loc = await Location.create({
                name: "Liked Location",
                image: "https://example.com/img.jpg",
                description: "Desc",
                author: { id: new mongoose.Types.ObjectId(), username: "u" },
                likes: 5,
            });
            const res = await request(app).get("/locations/api/likes");
            expect(res.status).toBe(200);
            expect(res.body[loc._id.toString()]).toBe(5);
        });
    });

    describe("GET /locations/new", () => {
        it("redirects to /login when not authenticated", async () => {
            const res = await request(app).get("/locations/new");
            expect(res.status).toBe(302);
            expect(res.headers.location).toMatch(/\/login/);
        });

        it("returns 200 when authenticated", async () => {
            const username = `locuser_${Date.now()}`;
            await request(app)
                .post("/register")
                .type("form")
                .send({ username, email: `${username}@test.com`, password: "password123" });
            const agent = request.agent(app);
            await agent.post("/login").type("form").send({ usernameOrEmail: username, password: "password123" });
            const res = await agent.get("/locations/new");
            expect(res.status).toBe(200);
            expect(res.text).toMatch(/Add|New|location|form/i);
        });
    });

    describe("GET /locations/:id", () => {
        it("redirects to /locations when location does not exist", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app).get(`/locations/${fakeId}`);
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/locations");
        });

        it("returns 200 when location exists", async () => {
            const loc = await Location.create({
                name: "Test Location",
                image: "https://example.com/img.jpg",
                description: "Test description",
                author: { id: new mongoose.Types.ObjectId(), username: "testuser" },
            });
            const res = await request(app).get(`/locations/${loc._id}`);
            expect(res.status).toBe(200);
            expect(res.text).toMatch(/Test Location|Test description/i);
        });
    });

    describe("POST /locations/:id/like", () => {
        it("returns 401 JSON when not authenticated (Accept: json)", async () => {
            const loc = await Location.create({
                name: "Like Test",
                image: "https://example.com/img.jpg",
                description: "Desc",
                author: { id: new mongoose.Types.ObjectId(), username: "u" },
            });
            const res = await request(app)
                .post(`/locations/${loc._id}/like`)
                .set("Accept", "application/json");
            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/login/i);
        });

        it("returns 200 JSON with likes count when authenticated (toggle like)", async () => {
            const username = `likeuser_${Date.now()}`;
            const user = await User.register(new User({ username }), "password123");
            const loc = await Location.create({
                name: "To Like",
                image: "https://example.com/img.jpg",
                description: "Desc",
                author: { id: new mongoose.Types.ObjectId(), username: "other" },
            });
            const agent = request.agent(app);
            await agent.post("/login").type("form").send({ usernameOrEmail: username, password: "password123" });
            const res = await agent
                .post(`/locations/${loc._id}/like`)
                .set("Accept", "application/json");
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("likes");
            expect(res.body).toHaveProperty("liked");
        });
    });

    describe("POST /locations", () => {
        it("redirects to /login when not authenticated", async () => {
            const res = await request(app).post("/locations").type("form").send({
                name: "New Location",
                image: "https://example.com/img.jpg",
                description: "Description",
            });
            expect(res.status).toBe(302);
            expect(res.headers.location).toMatch(/\/login/);
        });

        it("creates location and redirects to /locations when authenticated", async () => {
            const username = `postuser_${Date.now()}`;
            await request(app)
                .post("/register")
                .type("form")
                .send({ username, email: `${username}@test.com`, password: "password123" });
            const agent = request.agent(app);
            await agent.post("/login").type("form").send({ usernameOrEmail: username, password: "password123" });
            const res = await agent.post("/locations").type("form").send({
                name: "Created Location",
                image: "https://example.com/created.jpg",
                description: "Created description",
            });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/locations");
            const found = await Location.findOne({ name: "Created Location" });
            expect(found).not.toBeNull();
            expect(found.author.username).toBe(username);
        });
    });

    describe("PUT /locations/:id", () => {
        it("redirects to /login when not authenticated", async () => {
            const loc = await Location.create({
                name: "To Update",
                image: "https://example.com/img.jpg",
                description: "Desc",
                author: { id: new mongoose.Types.ObjectId(), username: "u" },
            });
            const res = await request(app)
                .put(`/locations/${loc._id}`)
                .type("form")
                .send({ group: { name: "Updated", image: "x", description: "y" } });
            expect(res.status).toBe(302);
            expect(res.headers.location).toMatch(/\/login/);
        });

        it("updates location and redirects when owner is authenticated", async () => {
            const username = `putuser_${Date.now()}`;
            const user = await User.register(new User({ username }), "password123");
            const loc = await Location.create({
                name: "Original Name",
                image: "https://example.com/img.jpg",
                description: "Original desc",
                author: { id: user._id, username: user.username },
            });
            const agent = request.agent(app);
            await agent.post("/login").type("form").send({ usernameOrEmail: username, password: "password123" });
            const res = await agent
                .put(`/locations/${loc._id}`)
                .type("form")
                .send({
                    group: {
                        name: "Updated Name",
                        image: "https://example.com/new.jpg",
                        description: "Updated description",
                    },
                });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe(`/locations/${loc._id}`);
            const updated = await Location.findById(loc._id);
            expect(updated.name).toBe("Updated Name");
            expect(updated.description).toBe("Updated description");
        });

        it("redirects with error when non-owner tries to update (location unchanged)", async () => {
            const owner = await User.register(
                new User({ username: `owner_${Date.now()}` }),
                "password123"
            );
            const loc = await Location.create({
                name: "Owned Location",
                image: "https://example.com/img.jpg",
                description: "Desc",
                author: { id: owner._id, username: owner.username },
            });
            const otherUser = `other_${Date.now()}`;
            await request(app)
                .post("/register")
                .type("form")
                .send({ username: otherUser, email: `${otherUser}@test.com`, password: "password123" });
            const agent = request.agent(app);
            await agent
                .post("/login")
                .type("form")
                .send({ usernameOrEmail: otherUser, password: "password123" });
            const res = await agent
                .put(`/locations/${loc._id}`)
                .type("form")
                .send({ group: { name: "Hacked", image: "x", description: "y" } });
            expect(res.status).toBe(302);
            const unchanged = await Location.findById(loc._id);
            expect(unchanged.name).toBe("Owned Location");
        });
    });

    describe("DELETE /locations/:id", () => {
        it("redirects to /login when not authenticated", async () => {
            const loc = await Location.create({
                name: "To Delete",
                image: "https://example.com/img.jpg",
                description: "Desc",
                author: { id: new mongoose.Types.ObjectId(), username: "u" },
            });
            const res = await request(app).delete(`/locations/${loc._id}`);
            expect(res.status).toBe(302);
            expect(res.headers.location).toMatch(/\/login/);
            const stillThere = await Location.findById(loc._id);
            expect(stillThere).not.toBeNull();
        });

        it("deletes location and redirects to /locations when owner is authenticated", async () => {
            const username = `deluser_${Date.now()}`;
            const user = await User.register(new User({ username }), "password123");
            const loc = await Location.create({
                name: "To Be Deleted",
                image: "https://example.com/img.jpg",
                description: "Desc",
                author: { id: user._id, username: user.username },
            });
            const agent = request.agent(app);
            await agent.post("/login").type("form").send({ usernameOrEmail: username, password: "password123" });
            const res = await agent.delete(`/locations/${loc._id}`);
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/locations");
            const gone = await Location.findById(loc._id);
            expect(gone).toBeNull();
        });

        it("redirects back with error when non-owner tries to delete", async () => {
            const owner = await User.register(
                new User({ username: `owner2_${Date.now()}` }),
                "password123"
            );
            const loc = await Location.create({
                name: "Owned For Delete",
                image: "https://example.com/img.jpg",
                description: "Desc",
                author: { id: owner._id, username: owner.username },
            });
            const otherUser = `other2_${Date.now()}`;
            await request(app)
                .post("/register")
                .type("form")
                .send({ username: otherUser, email: `${otherUser}@test.com`, password: "password123" });
            const agent = request.agent(app);
            await agent
                .post("/login")
                .type("form")
                .send({ usernameOrEmail: otherUser, password: "password123" });
            const res = await agent.delete(`/locations/${loc._id}`);
            expect(res.status).toBe(302);
            const stillThere = await Location.findById(loc._id);
            expect(stillThere).not.toBeNull();
        });
    });
});
