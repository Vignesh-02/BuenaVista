const {
    getOnboardingHtml,
    getLocationCreatedHtml,
    getCommentNotificationHtml,
} = require("../../lib/email-templates");

describe("email-templates", () => {
    describe("getOnboardingHtml", () => {
        it("returns HTML string with username in greeting", () => {
            const html = getOnboardingHtml("Alex");
            expect(html).toContain("Hola, Alex!");
            expect(typeof html).toBe("string");
        });

        it("includes BuenaVista branding", () => {
            const html = getOnboardingHtml("TestUser");
            expect(html).toMatch(/BuenaVista/i);
            expect(html).toMatch(/DISCOVER AMAZING LOCATIONS/i);
        });

        it("strips angle brackets from username to prevent XSS", () => {
            const html = getOnboardingHtml("<script>x</script>");
            expect(html).not.toContain("<script>");
            expect(html).not.toContain("</script>");
        });

        it("uses default Explorer when username is empty", () => {
            const html = getOnboardingHtml("");
            expect(html).toContain("Hola, Explorer!");
        });

        it("includes Explore locations link with given appUrl", () => {
            const html = getOnboardingHtml("User", "https://app.example.com");
            expect(html).toContain("https://app.example.com/locations");
        });

        it("uses default app URL when appUrl not provided", () => {
            const html = getOnboardingHtml("User");
            expect(html).toContain("/locations");
            expect(html).toMatch(/buenavista\.in|href=.*locations/);
        });
    });

    describe("getLocationCreatedHtml", () => {
        it("returns HTML with username, location name, and view URL", () => {
            const html = getLocationCreatedHtml(
                "Alice",
                "Sunset Beach",
                "https://app.example.com/locations/123"
            );
            expect(html).toContain("Hey Alice, your post is live.");
            expect(html).toContain("Sunset Beach");
            expect(html).toContain("https://app.example.com/locations/123");
            expect(html).toMatch(/YOUR POST IS LIVE|BuenaVista/i);
        });

        it("escapes location name to prevent XSS", () => {
            const html = getLocationCreatedHtml("U", "<script>alert(1)</script>", "https://x.com");
            expect(html).not.toContain("<script>");
        });
    });

    describe("getCommentNotificationHtml", () => {
        it("returns HTML with recipient, commenter, comment text, and view URL", () => {
            const html = getCommentNotificationHtml(
                "Author",
                "My Post",
                "Commenter",
                "Great view!",
                "https://app.example.com/locations/456"
            );
            expect(html).toContain("Author");
            expect(html).toContain("My Post");
            expect(html).toContain("Commenter");
            expect(html).toContain("Great view!");
            expect(html).toContain("https://app.example.com/locations/456");
            expect(html).toMatch(/YOUR COMMUNITY IS ENGAGING|BuenaVista/i);
        });

        it("escapes comment text and uses defaults for missing values", () => {
            const html = getCommentNotificationHtml(null, null, null, "Say <hi>", "https://u.com");
            expect(html).toContain("there");
            expect(html).not.toContain("<hi>");
            expect(html).toMatch(/Someone|said/i);
        });
    });
});
