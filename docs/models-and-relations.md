## Data Model & Relations

This document describes the core domain models in BuenaVista and how they relate to each other. The app uses **Mongoose** and MongoDB.

### Overview

- **User**
  - Accounts for login and ownership.
  - Auth managed by `passport-local-mongoose`.
- **Location** (stored as `Campground` in MongoDB)
  - A place shared by users, with title, image, description.
  - Owned by a single user.
  - Has many comments.
  - Can be liked by many users.
- **Comment**
  - Textual comment on a location.
  - Owned by a single user.

---

### ER‑style Diagram (textual)

```mermaid
erDiagram
    USER {
        ObjectId _id
        string   username
        string   password (hashed by passport-local-mongoose)
    }

    LOCATION {
        ObjectId _id
        string   name
        string   price
        string   image
        string   description
        ObjectId author.id
        string   author.username
        number   likes
        ObjectId[] likedBy
        ObjectId[] comments
        Date     createdAt
        Date     updatedAt
    }

    COMMENT {
        ObjectId _id
        string   text
        Date     createdAt
        ObjectId author.id
        string   author.username
    }

    USER ||--o{ LOCATION : "author of"
    USER ||--o{ COMMENT  : "author of"
    LOCATION ||--o{ COMMENT : "has many"
    USER }o--o{ LOCATION : "likes via likedBy"
```

> Note: In code, the `Location` model is exported as `Campground`:
> ```js
> module.exports = mongoose.model("Campground", campgroundSchema);
> ```

---

### User

Defined in `models/user.js`:

- **Fields**
  - `username` – required, 5–30 chars, trimmed, regex‑validated (`/^[a-zA-Z0-9_]+$/`).
  - `password` – stored but effectively managed by `passport-local-mongoose`.
- **Plugins**
  - `passport-local-mongoose` adds:
    - Password hashing / salting.
    - Methods: `User.register`, `User.authenticate`, `User.serializeUser`, `User.deserializeUser`.

**Relations**

- One user can:
  - Own many locations (`Location.author.id`).
  - Own many comments (`Comment.author.id`).
  - Like many locations (through `Location.likedBy`).

---

### Location (Campground)

Defined in `models/location.js` as `campgroundSchema`, exported as `Campground`.

- **Core Fields**
  - `name: String`
  - `price: String` – currently kept as a string; could be normalized later.
  - `image: String` – image URL.
  - `description: String`

- **Author (embedded reference)**
  ```js
  author: {
      id: { type: ObjectId, ref: "User" },
      username: String
  }
  ```
  - Embeds both the user id and a denormalized copy of the username.
  - This avoids a join when rendering simple “By <username>” text but still allows lookup of the full user if needed.

- **Comments (array of references)**
  ```js
  comments: [{ type: ObjectId, ref: "Comment" }]
  ```
  - Stores the ids of all `Comment` documents that belong to this location.
  - At read time, `routes/locations.js` uses `.populate("comments")` to load the full comment objects:
    ```js
    Location.findById(id).populate("comments");
    ```

- **Likes (counter + many‑to‑many)**
  ```js
  likes: {
      type: Number,
      default: 0,
      min: 0
  },
  likedBy: [{ type: ObjectId, ref: "User" }]
  ```
  - `likes` is a numeric counter used for fast display and sorting.
  - `likedBy` is a set (stored as an array) of user ids that have liked this location.
  - The like route (`POST /locations/:id/like`) toggles the presence of `req.user._id` in `likedBy` and updates `likes` accordingly.

- **Timestamps**
  - `timestamps: true` on the schema automatically adds:
    - `createdAt`
    - `updatedAt`
  - These are used in `views/locations/show.ejs` to show “Added X time ago” or “Updated Y time ago”.

**Relations**

- Each location:
  - Has exactly one author (`User`).
  - Has many comments (`Comment`).
  - Has many liking users (`User`), via `likedBy` (many‑to‑many).

---

### Comment

Defined in `models/comment.js`:

- **Fields**
  - `text: String` – the comment body.
  - `createdAt: Date` – defaults to `Date.now`.
  - `author` – embedded reference:
    ```js
    author: {
        id: { type: ObjectId, ref: "User" },
        username: String
    }
    ```

**Relations**

- Each comment:
  - Belongs to one `User` (via `author.id`).
  - Belongs to exactly one `Location`, referenced indirectly because the location’s `comments` array holds the comment id.

> There is no direct foreign key on `Comment` back to `Location`; that link is maintained from the `Location` side (`location.comments.push(comment)`).

---

### Request / Ownership Middleware

The relations above are enforced at the request level using middleware in `middleware/index.js`:

- `isLoggedIn`
  - Ensures `req.isAuthenticated()` is true.
  - Used for actions that require any authenticated user (e.g. creating locations or comments).

- `checkLocationOwnership`
  - Loads `Location` by id.
  - Verifies `foundLocation.author.id.equals(req.user._id)`.
  - If mismatch: flashes “You don't have permission to do that” and redirects back.

- `checkCommentOwnership`
  - Loads `Comment` by `comment_id`.
  - Verifies `foundComment.author.id.equals(req.user._id)`.
  - If mismatch: flashes “You don't have permission to do that”.

These middleware functions implement **authorization** on top of the data model by checking the embedded `author.id` relationships before allowing edits or deletes.

---

### Possible Future Enhancements (for senior‑level discussion)

- **Normalization**:
  - Replace denormalized `author.username` with a view or always resolve via `User` when rendering, if you need strong consistency (e.g. username changes).
  - Add an explicit `locationId` field to `Comment` for easier querying of all comments by location without relying on the `Location.comments` array.

- **Indexing**:
  - Index `Location.author.id` and `Location.likedBy` to make “my locations” and “locations I liked” queries fast.
  - Index `Comment.author.id` and `createdAt` for activity feeds.

- **Soft deletes / archival**:
  - Instead of hard deletes, add `deletedAt` fields to `Location` and `Comment` to support audit/restore.

These are natural places to explore if you want to show deeper modeling and scaling considerations in this codebase.

