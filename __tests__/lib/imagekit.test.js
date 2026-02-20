/**
 * Unit tests for lib/imagekit.js (getImageKit, uploadLocationImage, getDisplayImageUrl).
 */
jest.mock("@imagekit/nodejs", () => {
    const mockUpload = jest.fn().mockResolvedValue({ url: "https://ik.imagekit.io/test/img.jpg" });
    const mockToFile = jest.fn().mockResolvedValue(Buffer.from("fake-file"));
    const ImageKitConstructor = jest.fn().mockImplementation(() => ({
        files: { upload: mockUpload },
    }));
    ImageKitConstructor.toFile = mockToFile;
    return ImageKitConstructor;
});

const ImageKit = require("@imagekit/nodejs");
const {
    getImageKit,
    uploadLocationImage,
    getDisplayImageUrl,
    UPLOAD_FOLDER,
} = require("../../lib/imagekit");

describe("lib/imagekit", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.IMAGEKIT_PRIVATE_KEY;
        delete process.env.IMAGEKIT_PUBLIC_KEY;
        delete process.env.IMAGEKIT_URL;
        delete process.env.IMAGEKIT_USE_WEB_PROXY;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe("getImageKit", () => {
        it("throws when IMAGEKIT_PRIVATE_KEY is missing", () => {
            process.env.IMAGEKIT_PUBLIC_KEY = "pub";
            process.env.IMAGEKIT_URL = "https://ik.imagekit.io/abc";
            expect(() => getImageKit()).toThrow(/IMAGEKIT.*required/);
        });

        it("throws when IMAGEKIT_PUBLIC_KEY is missing", () => {
            process.env.IMAGEKIT_PRIVATE_KEY = "priv";
            process.env.IMAGEKIT_URL = "https://ik.imagekit.io/abc";
            expect(() => getImageKit()).toThrow(/IMAGEKIT.*required/);
        });

        it("throws when IMAGEKIT_URL is missing", () => {
            process.env.IMAGEKIT_PRIVATE_KEY = "priv";
            process.env.IMAGEKIT_PUBLIC_KEY = "pub";
            expect(() => getImageKit()).toThrow(/IMAGEKIT.*required/);
        });

        it("returns ImageKit instance when all env vars are set", () => {
            process.env.IMAGEKIT_PRIVATE_KEY = "private-key";
            process.env.IMAGEKIT_PUBLIC_KEY = "public-key";
            process.env.IMAGEKIT_URL = "https://ik.imagekit.io/myid";
            const client = getImageKit();
            expect(ImageKit).toHaveBeenCalledWith(
                expect.objectContaining({
                    privateKey: "private-key",
                    publicKey: "public-key",
                    urlEndpoint: "https://ik.imagekit.io/myid",
                })
            );
            expect(client).toHaveProperty("files");
            expect(client.files).toHaveProperty("upload");
        });

        it("strips whitespace and quotes from env values", () => {
            process.env.IMAGEKIT_PRIVATE_KEY = '  "priv"  \n';
            process.env.IMAGEKIT_PUBLIC_KEY = "  pub  ";
            process.env.IMAGEKIT_URL = "https://ik.imagekit.io/abc/";
            getImageKit();
            expect(ImageKit).toHaveBeenCalledWith(
                expect.objectContaining({
                    privateKey: "priv",
                    publicKey: "pub",
                    urlEndpoint: "https://ik.imagekit.io/abc",
                })
            );
        });
    });

    describe("uploadLocationImage", () => {
        it("uploads and returns url when env is set", async () => {
            process.env.IMAGEKIT_PRIVATE_KEY = "p";
            process.env.IMAGEKIT_PUBLIC_KEY = "k";
            process.env.IMAGEKIT_URL = "https://ik.imagekit.io/x";
            const result = await uploadLocationImage(
                Buffer.from("data"),
                "photo.jpg",
                "image/jpeg"
            );
            expect(result).toEqual({ url: "https://ik.imagekit.io/test/img.jpg" });
            expect(ImageKit).toHaveBeenCalled();
            const instance = ImageKit.mock.results[0].value;
            expect(instance.files.upload).toHaveBeenCalledWith(
                expect.objectContaining({
                    folder: UPLOAD_FOLDER,
                    fileName: expect.stringMatching(/^\d+-photo\.jpg$/),
                })
            );
        });
    });

    describe("getDisplayImageUrl", () => {
        it("returns url unchanged when url is empty or not string", () => {
            expect(getDisplayImageUrl("")).toBe("");
            expect(getDisplayImageUrl(null)).toBe(null);
            expect(getDisplayImageUrl(undefined)).toBe(undefined);
        });

        it("returns trimmed url when IMAGEKIT_URL is not set", () => {
            process.env.IMAGEKIT_URL = "";
            expect(getDisplayImageUrl("  https://example.com/img.jpg  ")).toBe(
                "https://example.com/img.jpg"
            );
        });

        it("transforms ImageKit URL with show size when IMAGEKIT_URL is set", () => {
            process.env.IMAGEKIT_URL = "https://ik.imagekit.io/myid";
            const ikUrl = "https://ik.imagekit.io/myid/locations/123.jpg";
            const result = getDisplayImageUrl(ikUrl);
            expect(result).toMatch(/tr:w-640,q-90/);
            expect(result).toContain("123.jpg");
        });

        it("uses thumb size when options.size is thumb", () => {
            process.env.IMAGEKIT_URL = "https://ik.imagekit.io/myid";
            const ikUrl = "https://ik.imagekit.io/myid/locations/123.jpg";
            const result = getDisplayImageUrl(ikUrl, { size: "thumb" });
            expect(result).toMatch(/tr:w-400,q-85/);
        });

        it("returns external URL as-is when not ImageKit and no web proxy", () => {
            process.env.IMAGEKIT_URL = "https://ik.imagekit.io/myid";
            const external = "https://example.com/photo.jpg";
            expect(getDisplayImageUrl(external)).toBe(external);
        });
    });
});
