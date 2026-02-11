const request = require("supertest");
const mongoose = require("mongoose");
const User = require("../../models/user");
const Location = require("../../models/location");
const Comment = require("../../models/comment");

let app;

beforeAll(async () => {
    await global.mongoPromise;
    const mod = require("../../app");
    app = mod.app;
    const connectDB = require("../../db");
    await connectDB();
}, 20000);

afterAll(async () => {
    await Comment.deleteMany({});
    await Location.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
});

describe("Comments routes (integration)", () => {
    let testLocationId;

    beforeAll(async () => {
        const loc = await Location.create({
            name: "Comment Test Location",
            image: "https://example.com/img.jpg",
            description: "For comment tests",
            author: { id: new mongoose.Types.ObjectId(), username: "commentuser" },
        });
        testLocationId = loc._id.toString();
    });

    describe("GET /locations/:id/comments/new", () => {
        it("redirects to /login when not authenticated", async () => {
            const res = await request(app).get(`/locations/${testLocationId}/comments/new`);
            expect(res.status).toBe(302);
            expect(res.headers.location).toMatch(/\/login/);
        });

        it("returns 200 when authenticated", async () => {
            const username = `commentuser_${Date.now()}`;
            await request(app)
                .post("/register")
                .type("form")
                .send({ username, password: "password123" });
            const agent = request.agent(app);
            await agent.post("/login").type("form").send({ username, password: "password123" });
            const res = await agent.get(`/locations/${testLocationId}/comments/new`);
            expect(res.status).toBe(200);
            expect(res.text).toMatch(/comment|Add|form/i);
        });
    });

    describe("POST /locations/:id/comments", () => {
        it("redirects to /login when not authenticated", async () => {
            const res = await request(app)
                .post(`/locations/${testLocationId}/comments`)
                .type("form")
                .send({ comment: { text: "A new comment" } });
            expect(res.status).toBe(302);
            expect(res.headers.location).toMatch(/\/login/);
        });

        it("creates comment and redirects when authenticated", async () => {
            const username = `postcomment_${Date.now()}`;
            await request(app)
                .post("/register")
                .type("form")
                .send({ username, password: "password123" });
            const agent = request.agent(app);
            await agent.post("/login").type("form").send({ username, password: "password123" });
            const res = await agent
                .post(`/locations/${testLocationId}/comments`)
                .type("form")
                .send({ comment: { text: "My new comment text" } });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe(`/locations/${testLocationId}`);
            const comment = await Comment.findOne({ text: "My new comment text" });
            expect(comment).not.toBeNull();
            expect(comment.author.username).toBe(username);
        });
    });

    describe("GET /locations/:id/comments/:comment_id/edit", () => {
        it("redirects to /login when not authenticated", async () => {
            const comment = await Comment.create({
                text: "Edit test comment",
                author: { id: new mongoose.Types.ObjectId(), username: "editor" },
            });
            const res = await request(app).get(
                `/locations/${testLocationId}/comments/${comment._id}/edit`
            );
            expect(res.status).toBe(302);
            expect(res.headers.location).toMatch(/\/login/);
        });
    });

    describe("PUT /locations/:id/comments/:comment_id", () => {
        it("redirects to /login when not authenticated", async () => {
            const comment = await Comment.create({
                text: "To update",
                author: { id: new mongoose.Types.ObjectId(), username: "u" },
            });
            const res = await request(app)
                .put(`/locations/${testLocationId}/comments/${comment._id}`)
                .type("form")
                .send({ comment: { text: "Updated text" } });
            expect(res.status).toBe(302);
            expect(res.headers.location).toMatch(/\/login/);
        });

        it("updates comment and redirects when owner is authenticated", async () => {
            const username = `commentowner_${Date.now()}`;
            const user = await User.register(new User({ username }), "password123");
            const comment = await Comment.create({
                text: "Original comment text",
                author: { id: user._id, username: user.username },
            });
            const agent = request.agent(app);
            await agent.post("/login").type("form").send({ username, password: "password123" });
            const res = await agent
                .put(`/locations/${testLocationId}/comments/${comment._id}`)
                .type("form")
                .send({ comment: { text: "Updated comment text" } });
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe(`/locations/${testLocationId}`);
            const updated = await Comment.findById(comment._id);
            expect(updated.text).toBe("Updated comment text");
        });

        it("does not update when non-owner tries to update", async () => {
            const owner = await User.register(
                new User({ username: `comowner_${Date.now()}` }),
                "password123"
            );
            const comment = await Comment.create({
                text: "Only owner can edit",
                author: { id: owner._id, username: owner.username },
            });
            const otherUser = `comother_${Date.now()}`;
            await request(app)
                .post("/register")
                .type("form")
                .send({ username: otherUser, password: "password123" });
            const agent = request.agent(app);
            await agent
                .post("/login")
                .type("form")
                .send({ username: otherUser, password: "password123" });
            const res = await agent
                .put(`/locations/${testLocationId}/comments/${comment._id}`)
                .type("form")
                .send({ comment: { text: "Hacked text" } });
            expect(res.status).toBe(302);
            const unchanged = await Comment.findById(comment._id);
            expect(unchanged.text).toBe("Only owner can edit");
        });
    });

    describe("DELETE /locations/:id/comments/:comment_id", () => {
        it("redirects to /login when not authenticated", async () => {
            const comment = await Comment.create({
                text: "To delete",
                author: { id: new mongoose.Types.ObjectId(), username: "u" },
            });
            const res = await request(app).delete(
                `/locations/${testLocationId}/comments/${comment._id}`
            );
            expect(res.status).toBe(302);
            expect(res.headers.location).toMatch(/\/login/);
            const stillThere = await Comment.findById(comment._id);
            expect(stillThere).not.toBeNull();
        });

        it("deletes comment and redirects when owner is authenticated", async () => {
            const username = `delcomment_${Date.now()}`;
            const user = await User.register(new User({ username }), "password123");
            const comment = await Comment.create({
                text: "To be deleted",
                author: { id: user._id, username: user.username },
            });
            const agent = request.agent(app);
            await agent.post("/login").type("form").send({ username, password: "password123" });
            const res = await agent.delete(`/locations/${testLocationId}/comments/${comment._id}`);
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe(`/locations/${testLocationId}`);
            const gone = await Comment.findById(comment._id);
            expect(gone).toBeNull();
        });

        it("does not delete when non-owner tries to delete", async () => {
            const owner = await User.register(
                new User({ username: `delowner_${Date.now()}` }),
                "password123"
            );
            const comment = await Comment.create({
                text: "Only owner can delete",
                author: { id: owner._id, username: owner.username },
            });
            const otherUser = `delother_${Date.now()}`;
            await request(app)
                .post("/register")
                .type("form")
                .send({ username: otherUser, password: "password123" });
            const agent = request.agent(app);
            await agent
                .post("/login")
                .type("form")
                .send({ username: otherUser, password: "password123" });
            const res = await agent.delete(`/locations/${testLocationId}/comments/${comment._id}`);
            expect(res.status).toBe(302);
            const stillThere = await Comment.findById(comment._id);
            expect(stillThere).not.toBeNull();
        });
    });
});
