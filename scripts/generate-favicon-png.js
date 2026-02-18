/**
 * Generates favicon.png from favicon.svg with transparent background.
 * Run from project root: node scripts/generate-favicon-png.js
 */
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const publicDir = path.join(__dirname, "..", "public");
const svgPath = path.join(publicDir, "favicon.svg");
const outPath = path.join(publicDir, "favicon.png");

if (!fs.existsSync(svgPath)) {
    console.error("favicon.svg not found in public/");
    process.exit(1);
}

sharp(svgPath)
    .resize(32, 32)
    .png()
    .toFile(outPath)
    .then((info) => {
        console.log("Generated public/favicon.png with transparent background", info);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
