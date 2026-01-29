const mongoose = require("mongoose");

const campgroundSchema = new mongoose.Schema({
    name: String,
    price: String,
    image: String,
    description: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }
    ]
}, {
    timestamps: true  // Automatically adds createdAt and updatedAt fields
});

module.exports = mongoose.model("Campground", campgroundSchema);
