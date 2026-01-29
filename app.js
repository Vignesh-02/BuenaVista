const express = require("express");
const mongoose = require("mongoose");
const flash = require("connect-flash");
const passport = require("passport");
const methodOverride = require("method-override");
const LocalStrategy = require("passport-local");
const session = require("express-session");
const User = require("./models/user");
// const seedDB = require("./seeds");

require('dotenv').config();

const app = express();

// Database connection (Mongoose 8+ no longer needs useNewUrlParser/useUnifiedTopology)
const url = process.env.MONGODB_URL;
mongoose.connect(url)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection error:", err));

// App configuration
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride('_method'));
app.use(flash());

// Make moment available in all templates
app.locals.moment = require('moment-timezone');

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || "buenavista-secret-key",
    resave: false,
    saveUninitialized: false
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Middleware to pass currentUser and flash messages to all templates
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

// Seed database (uncomment if needed)
// seedDB();

// Routes
const commentRoutes = require("./routes/comments");
const locationRoutes = require("./routes/locations");
const indexRoutes = require("./routes/index");

app.use("/", indexRoutes);
app.use("/locations", locationRoutes);
app.use("/locations/:id/comments", commentRoutes);

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`BuenaVista server running on port ${port}`);
});
