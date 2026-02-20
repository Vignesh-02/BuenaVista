/**
 * Unit tests for lib/email.js (sendOnboardingEmail, sendLocationCreatedEmail, sendCommentNotificationEmail).
 * Resend is mocked so no real API calls are made.
 */
jest.mock("resend");

const Resend = require("resend").Resend;
const {
    sendOnboardingEmail,
    sendLocationCreatedEmail,
    sendCommentNotificationEmail,
} = require("../../lib/email");

describe("lib/email", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe("when RESEND_API_KEY is not set", () => {
        beforeEach(() => {
            delete process.env.RESEND_API_KEY;
        });

        it("sendOnboardingEmail returns without calling Resend", async () => {
            const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
            await sendOnboardingEmail("test@example.com", "User");
            expect(Resend).not.toHaveBeenCalled();
            expect(warnSpy).toHaveBeenCalledWith(
                "RESEND_API_KEY not set; skipping onboarding email."
            );
            warnSpy.mockRestore();
        });

        it("sendOnboardingEmail returns when email is empty", async () => {
            await sendOnboardingEmail("", "User");
            await sendOnboardingEmail(null, "User");
            expect(Resend).not.toHaveBeenCalled();
        });

        it("sendLocationCreatedEmail returns without calling Resend", async () => {
            await sendLocationCreatedEmail("test@example.com", "User", "My Post", "loc123");
            expect(Resend).not.toHaveBeenCalled();
        });

        it("sendCommentNotificationEmail returns without calling Resend", async () => {
            await sendCommentNotificationEmail(
                "author@example.com",
                "Author",
                "Post",
                "loc1",
                "Commenter",
                "Hello"
            );
            expect(Resend).not.toHaveBeenCalled();
        });
    });

    describe("when RESEND_API_KEY is set", () => {
        let sendMock;

        beforeEach(() => {
            process.env.RESEND_API_KEY = "re_test_key";
            sendMock = jest.fn().mockResolvedValue({ error: null });
            Resend.mockImplementation(() => ({ emails: { send: sendMock } }));
        });

        it("sendOnboardingEmail calls Resend and sends with correct to, subject", async () => {
            await sendOnboardingEmail("welcome@example.com", "Alice");
            expect(Resend).toHaveBeenCalledWith("re_test_key");
            expect(sendMock).toHaveBeenCalledTimes(1);
            expect(sendMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: "welcome@example.com",
                    subject: expect.stringMatching(/Alice.*Welcome to BuenaVista/i),
                    from: expect.stringContaining("welcome@buenavista"),
                })
            );
        });

        it("sendLocationCreatedEmail calls send with location name and view URL", async () => {
            await sendLocationCreatedEmail("u@example.com", "Bob", "Sunset Beach", "loc456");
            expect(sendMock).toHaveBeenCalledTimes(1);
            expect(sendMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: "u@example.com",
                    subject: expect.stringMatching(/Sunset Beach.*live/i),
                    from: expect.stringContaining("info@buenavista"),
                })
            );
            const call = sendMock.mock.calls[0][0];
            expect(call.text).toContain("Sunset Beach");
            expect(call.text).toMatch(/locations\/loc456/);
        });

        it("sendCommentNotificationEmail calls send with commenter and comment text", async () => {
            await sendCommentNotificationEmail(
                "author@example.com",
                "Author",
                "My Location",
                "loc789",
                "Commenter",
                "Great post!"
            );
            expect(sendMock).toHaveBeenCalledTimes(1);
            expect(sendMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: "author@example.com",
                    subject: expect.stringMatching(/Commenter.*commented/i),
                    from: expect.stringContaining("info@buenavista"),
                })
            );
            const call = sendMock.mock.calls[0][0];
            expect(call.text).toContain("Great post!");
            expect(call.text).toMatch(/locations\/loc789/);
        });
    });
});
