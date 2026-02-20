const { getOnboardingHtml } = require("../../lib/email-templates");

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
});
