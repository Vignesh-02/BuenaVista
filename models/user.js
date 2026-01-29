const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Username is required."],
        trim: true,
        minlength: [5, "Username must be at least 5 characters."],
        maxlength: [30, "Username must be at most 30 characters."],
        match: [/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."],
    },
    password: String,
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
