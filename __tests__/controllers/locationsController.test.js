/**
 * Unit tests for locationsController (uploadImage, extractImageFromLink, error paths).
 * Integration tests already cover happy paths; these cover branches that need mocks.
 */
jest.mock("../../models/location");
jest.mock("../../lib/imagekit");
jest.mock("../../lib/email");

const { uploadLocationImage } = require("../../lib/imagekit");
const locationsController = require("../../controllers/locationsController");

function mockReq(overrides = {}) {
    return {
        params: {},
        body: {},
        user: null,
        file: null,
        set: jest.fn(),
        flash: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        accepts: jest.fn().mockReturnValue(false),
        ...overrides,
    };
}

function mockRes() {
    const res = {};
    res.set = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    res.render = jest.fn().mockReturnValue(res);
    return res;
}

describe("locationsController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("uploadImage", () => {
        it("returns 400 when req.file is missing", async () => {
            const req = mockReq({ file: null });
            const res = mockRes();
            await locationsController.uploadImage(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "No file uploaded. Choose an image file.",
            });
            expect(uploadLocationImage).not.toHaveBeenCalled();
        });

        it("returns 200 and url when upload succeeds", async () => {
            uploadLocationImage.mockResolvedValue({ url: "https://ik.imagekit.io/abc/photo.jpg" });
            const req = mockReq({
                file: {
                    buffer: Buffer.from("x"),
                    originalname: "photo.jpg",
                    mimetype: "image/jpeg",
                },
            });
            const res = mockRes();
            await locationsController.uploadImage(req, res);
            expect(uploadLocationImage).toHaveBeenCalledWith(
                req.file.buffer,
                "photo.jpg",
                "image/jpeg"
            );
            expect(res.json).toHaveBeenCalledWith({ url: "https://ik.imagekit.io/abc/photo.jpg" });
        });

        it("returns 403 when ImageKit auth fails", async () => {
            uploadLocationImage.mockRejectedValue({
                status: 403,
                error: { message: "cannot be authenticated" },
            });
            const req = mockReq({
                file: { buffer: Buffer.from("x"), originalname: "a.jpg", mimetype: "image/jpeg" },
            });
            const res = mockRes();
            await locationsController.uploadImage(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: expect.stringMatching(/ImageKit authentication/) })
            );
        });

        it("returns 500 on generic upload error", async () => {
            uploadLocationImage.mockRejectedValue(new Error("Network error"));
            const req = mockReq({
                file: { buffer: Buffer.from("x"), originalname: "a.jpg", mimetype: "image/jpeg" },
            });
            const res = mockRes();
            await locationsController.uploadImage(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: expect.stringMatching(/Image upload failed/) })
            );
        });
    });

    describe("extractImageFromLink", () => {
        it("returns 400 when url is empty", async () => {
            const req = mockReq({ body: {} });
            const res = mockRes();
            await locationsController.extractImageFromLink(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "Please paste a link." });
        });

        it("returns 400 when url does not start with http", async () => {
            const req = mockReq({ body: { url: "ftp://example.com" } });
            const res = mockRes();
            await locationsController.extractImageFromLink(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "Link must start with http:// or https://",
            });
        });

        it("returns imageUrl for Google Images imgres link", async () => {
            const req = mockReq({
                body: {
                    url: "https://www.google.com/imgres?imgurl=https://example.com/real-image.jpg",
                },
            });
            const res = mockRes();
            await locationsController.extractImageFromLink(req, res);
            expect(res.json).toHaveBeenCalledWith({
                imageUrl: "https://example.com/real-image.jpg",
            });
        });

        it("returns imageUrl from og:image when fetch returns HTML", async () => {
            const originalFetch = global.fetch;
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () =>
                    Promise.resolve(
                        '<html><head><meta property="og:image" content="https://cdn.example.com/photo.jpg"></head></html>'
                    ),
            });
            const req = mockReq({
                body: { url: "https://example.com/page" },
            });
            const res = mockRes();
            await locationsController.extractImageFromLink(req, res);
            expect(res.json).toHaveBeenCalledWith({
                imageUrl: "https://cdn.example.com/photo.jpg",
            });
            global.fetch = originalFetch;
        });

        it("returns 400 when page has no og:image", async () => {
            const originalFetch = global.fetch;
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve("<html><head></head><body>No image</body></html>"),
            });
            const req = mockReq({
                body: { url: "https://example.com/no-image-page" },
            });
            const res = mockRes();
            await locationsController.extractImageFromLink(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "No image found on this page. Try pasting a direct image URL instead.",
            });
            global.fetch = originalFetch;
        });
    });
});
