#!/usr/bin/env node
/**
 * Starts in-memory MongoDB and the app for E2E tests.
 * Playwright runs this as webServer; the app gets MONGODB_URL and NODE_ENV=test from env.
 */
const { spawn } = require("child_process");
const path = require("path");

const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod;
let child;

async function main() {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.NODE_ENV = "test";
    process.env.MONGODB_URL = uri;
    process.env.PORT = process.env.PORT || "5000";

    const appPath = path.join(__dirname, "..", "app.js");
    child = spawn(process.execPath, [appPath], {
        stdio: "inherit",
        env: {
            ...process.env,
            NODE_ENV: "test",
            MONGODB_URL: uri,
            PORT: process.env.PORT || "5000",
        },
        cwd: path.join(__dirname, ".."),
    });

    child.on("error", (err) => {
        console.error("E2E server child error:", err);
        process.exit(1);
    });
    child.on("exit", (code, signal) => {
        if (code != null && code !== 0) process.exit(code);
        if (signal) process.exit(1);
    });

    function shutdown() {
        if (child) child.kill("SIGTERM");
        if (mongod)
            mongod
                .stop()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
        else process.exit(0);
    }
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

main().catch((err) => {
    console.error("E2E server failed:", err);
    process.exit(1);
});
