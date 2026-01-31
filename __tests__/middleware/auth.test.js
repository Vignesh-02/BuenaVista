jest.mock("../../models/location", () => ({ findById: jest.fn() }));
jest.mock("../../models/comment", () => ({ findById: jest.fn() }));

const Location = require("../../models/location");
const Comment = require("../../models/comment");
const middleware = require("../../middleware");

describe("isLoggedIn", () => {
    it("calls next() when user is authenticated", () => {
        const req = { isAuthenticated: jest.fn(() => true) };
        const res = { flash: jest.fn(), redirect: jest.fn() };
        const next = jest.fn();

        middleware.isLoggedIn(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.redirect).not.toHaveBeenCalled();
    });

    it("flashes error and redirects to /login when not authenticated", () => {
        const req = { isAuthenticated: jest.fn(() => false), flash: jest.fn() };
        const res = { redirect: jest.fn() };
        const next = jest.fn();

        middleware.isLoggedIn(req, res, next);

        expect(req.flash).toHaveBeenCalledWith("error", "You need to be logged in to do that");
        expect(res.redirect).toHaveBeenCalledWith("/login");
        expect(next).not.toHaveBeenCalled();
    });
});

describe("checkLocationOwnership", () => {
    beforeEach(() => {
        Location.findById.mockReset();
    });

    it("calls next() when user owns the location", async () => {
        const mockLocation = {
            author: { id: { equals: jest.fn(() => true) } },
        };
        Location.findById.mockResolvedValue(mockLocation);

        const req = {
            isAuthenticated: jest.fn(() => true),
            user: { _id: "user123" },
            params: { id: "loc1" },
            flash: jest.fn(),
        };
        const res = { redirect: jest.fn() };
        const next = jest.fn();

        await middleware.checkLocationOwnership(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.redirect).not.toHaveBeenCalled();
    });

    it("flashes error and redirects when user does not own the location", async () => {
        const mockLocation = {
            author: { id: { equals: jest.fn(() => false) } },
        };
        Location.findById.mockResolvedValue(mockLocation);

        const req = {
            isAuthenticated: jest.fn(() => true),
            user: { _id: "otheruser" },
            params: { id: "loc1" },
            flash: jest.fn(),
        };
        const res = { redirect: jest.fn() };

        await middleware.checkLocationOwnership(req, res, jest.fn());

        expect(req.flash).toHaveBeenCalledWith("error", "You don't have permission to do that");
        expect(res.redirect).toHaveBeenCalledWith("back");
    });

    it("flashes error and redirects when not authenticated", async () => {
        const req = {
            isAuthenticated: jest.fn(() => false),
            flash: jest.fn(),
        };
        const res = { redirect: jest.fn() };

        await middleware.checkLocationOwnership(req, res, jest.fn());

        expect(req.flash).toHaveBeenCalledWith("error", "You need to be logged in to do that");
        expect(res.redirect).toHaveBeenCalledWith("/login");
    });

    it("flashes error when location not found", async () => {
        Location.findById.mockResolvedValue(null);

        const req = {
            isAuthenticated: jest.fn(() => true),
            user: { _id: "user123" },
            params: { id: "nonexistent" },
            flash: jest.fn(),
        };
        const res = { redirect: jest.fn() };

        await middleware.checkLocationOwnership(req, res, jest.fn());

        expect(req.flash).toHaveBeenCalledWith("error", "Location not found");
        expect(res.redirect).toHaveBeenCalledWith("back");
    });
});

describe("checkCommentOwnership", () => {
    beforeEach(() => {
        Comment.findById.mockReset();
    });

    it("calls next() when user owns the comment", async () => {
        const mockComment = {
            author: { id: { equals: jest.fn(() => true) } },
        };
        Comment.findById.mockResolvedValue(mockComment);

        const req = {
            isAuthenticated: jest.fn(() => true),
            user: { _id: "user123" },
            params: { comment_id: "comment1" },
            flash: jest.fn(),
        };
        const res = { redirect: jest.fn() };
        const next = jest.fn();

        await middleware.checkCommentOwnership(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it("flashes error when not authenticated", async () => {
        const req = {
            isAuthenticated: jest.fn(() => false),
            flash: jest.fn(),
        };
        const res = { redirect: jest.fn() };

        await middleware.checkCommentOwnership(req, res, jest.fn());

        expect(req.flash).toHaveBeenCalledWith("error", "You need to be logged in to do that");
        expect(res.redirect).toHaveBeenCalledWith("/login");
    });
});
