const express = require("express");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const methodOverride = require("method-override");
const LocalStrategy = require("passport-local");
const session = require("express-session");
const User = require("./models/user");
// const seedDB = require("./seeds");
const connectDB = require("./db");
if (process.env.NODE_ENV !== "test") require("dotenv").config();
// In test, MONGODB_URL is set by E2E server (spawn env) or Jest global; never load .env in test.
if (process.env.NODE_ENV === "test") {
    process.env.MONGODB_URL = process.env.MONGODB_URL || global.TEST_MONGODB_URI;
}

const app = express();

// Trust proxy in production so req.secure and req.protocol reflect the original HTTPS request.
// Use "true" so all proxy hops are trusted (some hosts use multiple proxies).
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", true);
}

// App configuration
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
// Serve static files BEFORE session so /public requests don't create new sessions
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());

// Make moment available in all templates
app.locals.moment = require("moment-timezone");
// Image display helper: sharp, properly sized ImageKit URLs; pass-through for external URLs
const { getDisplayImageUrl } = require("./lib/imagekit");
app.locals.getDisplayImageUrl = getDisplayImageUrl;

// Session configuration (MongoStore for production; avoids MemoryStore warning)
const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !process.env.SESSION_SECRET) {
    console.error("SESSION_SECRET must be set in production");
    process.exit(1);
}
app.use(
    session({
        secret: process.env.SESSION_SECRET || "buenavista-secret-key",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URL,
            ttl: 14 * 24 * 60 * 60, // 14 days
        }),
        cookie: {
            // Only use Secure on HTTPS; on http://localhost the browser won't send the cookie otherwise
            secure: isProduction && process.env.USE_HTTPS !== "false",
            httpOnly: true,
            maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
            sameSite: "lax",
        },
    })
);

// Passport configuration: login with username OR email (single field)
app.use(passport.initialize());
app.use(passport.session());
passport.use(
    new LocalStrategy(
        { usernameField: "usernameOrEmail", passwordField: "password" },
        (usernameOrEmail, password, done) => {
            User.findOne({
                $or: [{ username: usernameOrEmail }, { email: usernameOrEmail.toLowerCase() }],
            })
                .then((user) => {
                    if (!user) return done(null, false);
                    user.authenticate(password, (err, result) => {
                        if (err) return done(err);
                        return done(null, result ? user : false);
                    });
                })
                .catch(done);
        }
    )
);
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Middleware to pass currentUser and flash messages to all templates.
// Only read flash (which modifies the session) when the session has user or flash data.
// Otherwise we'd mark new empty sessions as modified and save them to MongoDB.
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    const hasSessionData =
        req.session.passport || (req.session.flash && Object.keys(req.session.flash).length > 0);
    if (hasSessionData) {
        res.locals.error = req.flash("error");
        res.locals.success = req.flash("success");
    } else {
        res.locals.error = [];
        res.locals.success = [];
    }
    if (req.query.logged_out) {
        res.locals.success = ["You have been logged out!"];
    }
    next();
});

// Routes
const commentRoutes = require("./routes/comments");
const locationRoutes = require("./routes/locations");
const indexRoutes = require("./routes/index");

app.use("/", indexRoutes);
app.use("/locations", locationRoutes);
app.use("/locations/:id/comments", commentRoutes);

// Start server only when run directly (not when required by tests)
const port = process.env.PORT || 5004;
if (require.main === module) {
    (async () => {
        await connectDB();
        app.listen(port, () => {
            console.log(`BuenaVista server running on port ${port}`);
        });
    })();
}

module.exports = { app };
