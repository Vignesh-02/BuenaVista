## BuenaVista API & Routes

This document describes the main routes exposed by the BuenaVista application and how they behave. The app is a classic server‑rendered Express + EJS site; most routes return HTML pages, not JSON.

All routes assume the server is running at `http://localhost:5000` in development.

---

### 1. Authentication & Session

#### `GET /register`
- **Purpose**: Show the registration form.
- **Auth required**: No.
- **Response**: HTML page (`views/register.ejs`) with username/password fields.

#### `POST /register`
- **Purpose**: Create a new user account and log them in.
- **Auth required**: No.
- **Body (form-encoded)**:
  - `username` – 5‑30 chars, letters/numbers/underscores only.
  - `password` – at least 8 chars.
- **Validation**:
  - Done via `utils/validation.validateRegister`.
  - On validation error: flashes `error` and redirects back to `/register`.
- **On success**:
  - Creates `User` via `passport-local-mongoose` (`User.register`).
  - Logs the user in (`req.login`).
  - Flashes `success: "Welcome to BuenaVista, <username>!"`.
  - Redirects to `/locations`.

#### `GET /login`
- **Purpose**: Show the login form.
- **Auth required**: No.
- **Response**: HTML page (`views/login.ejs`).

#### `POST /login`
- **Purpose**: Authenticate an existing user.
- **Auth required**: No.
- **Body (form-encoded)**:
  - `username`
  - `password`
- **Validation**:
  - `utils/validation.validateLogin` checks non‑empty credentials.
  - On validation error: flashes `error` and redirects back to `/login`.
- **On success**:
  - Uses `passport.authenticate("local")`.
  - On wrong credentials: redirects to `/login` and flashes `"Invalid username or password. Please try again."`.
  - On success:
    - Flashes `success: "Welcome back, <username>!"`.
    - Redirects to `/locations`.

#### `GET /logout`
- **Purpose**: Log the user out and destroy the session.
- **Auth required**: User must be logged in (enforced by `passport`).
- **Behavior**:
  - Calls `req.logout`.
  - Destroys the session in MongoStore.
  - Redirects to `/locations?logged_out=1`.
  - The query param triggers a one‑time “You have been logged out!” toast.

---

### 2. Locations

All location logic lives in `routes/locations.js`, backed by the `Campground` model (`models/location.js`). In the UI these are called “locations”, but the underlying model is named `Campground`.

#### `GET /locations`
- **Purpose**: Show all locations.
- **Auth required**: No.
- **Behavior**:
  - Loads all locations: `Location.find({})`.
  - Renders `views/locations/index.ejs` with `locations`.
  - Sets `Cache-Control: public, max-age=300` for basic caching.
  - Like counts are refreshed client‑side via `/locations/api/likes`.

#### `GET /locations/api/likes`
- **Purpose**: Provide up‑to‑date like counts as JSON for the index page.
- **Auth required**: No.
- **Response (JSON)**:
  ```json
  {
    "<locationId>": <likesNumber>,
    "...": "..."
  }
  ```
- **Notes**:
  - `Cache-Control: no-store` to always return fresh counts.
  - Used by client JS in `views/locations/index.ejs` to keep like counts in sync without a full page reload.

#### `GET /locations/new`
- **Purpose**: Show the form to create a new location.
- **Auth required**: Yes (`middleware.isLoggedIn`).
- **Response**: HTML form (`views/locations/new.ejs`).

#### `POST /locations`
- **Purpose**: Create a new location.
- **Auth required**: Yes.
- **Body (form-encoded)**:
  - `name` – location name.
  - `image` – image URL.
  - `description` – text description.
- **Behavior**:
  - Builds an `author` object from `req.user` (`{ id, username }`).
  - Creates a `Location` document:
    ```js
    { name, image, description, author }
    ```
  - Flashes `success: "Location created successfully!"`.
  - Redirects to `/locations`.

#### `GET /locations/:id`
- **Purpose**: Show a single location, its details, and its comments.
- **Auth required**: No.
- **Behavior**:
  - Loads the location by id: `Location.findById(id).populate("comments")`.
  - If not found: flashes `error: "Location not found"` and redirects to `/locations`.
  - Renders `views/locations/show.ejs` with a single `location`.
  - The page includes:
    - Like button (AJAX, no page reload).
    - Share dropdown (Gmail, WhatsApp, X/Twitter, Facebook, Instagram/copy link).
    - Translate button that uses a third‑party translation API.

#### `POST /locations/:id/like`
- **Purpose**: Toggle a like on a location for the current user; keep a numeric counter in MongoDB.
- **Auth required**: Yes.
- **Request**:
  - Can be called either via:
    - Regular form POST (non‑AJAX), or
    - Fetch/XHR from the show page, sending `Accept: application/json`.
- **Behavior**:
  - If user is not authenticated:
    - For JSON requests: returns `401 { error: "Login required" }`.
    - For HTML: flashes an error and redirects to `/login`.
  - Loads location by `id`.
  - Ensures `location.likedBy` is an array.
  - Checks if `req.user._id` is present in `location.likedBy`:
    - If already liked:
      - Removes the user id from `likedBy`.
      - Decrements `likes` (never below 0).
    - If not liked:
      - Pushes user id to `likedBy`.
      - Increments `likes`.
  - Saves the location.
- **Response**:
  - **JSON (preferred from frontend)**:
    ```json
    {
      "likes": 5,
      "liked": true
    }
    ```
  - **HTML form**: Redirects back to `/locations/:id`.

#### `GET /locations/:id/edit`
- **Purpose**: Show the edit form for a location.
- **Auth required**: Yes, and user must own the location (`middleware.checkLocationOwnership`).
- **Response**: HTML (`views/locations/edit.ejs`).

#### `PUT /locations/:id`
- **Purpose**: Update an existing location.
- **Auth required**: Yes, and user must own the location.
- **Body (form-encoded)**:
  - Expecting `req.body.group` to contain updated fields (name, image, description).
- **Behavior**:
  - Merges `req.body.group` with `updatedAt: new Date()`.
  - Runs `Location.findByIdAndUpdate` with `runValidators: true`.
  - Flashes `success: "Location updated successfully!"`.
  - Redirects to `/locations/:id`.

#### `DELETE /locations/:id`
- **Purpose**: Delete an existing location.
- **Auth required**: Yes, and user must own the location.
- **Behavior**:
  - Deletes the document via `Location.findByIdAndDelete`.
  - Flashes `success: "Location deleted successfully!"`.
  - Redirects to `/locations`.

---

### 3. Comments

Comments are nested under locations: `/locations/:id/comments/...`. They are implemented in `routes/comments.js` and backed by the `Comment` model.

#### `GET /locations/:id/comments/new`
- **Purpose**: Show the “new comment” form below a location.
- **Auth required**: Yes (`middleware.isLoggedIn`).
- **Behavior**:
  - Loads the parent location.
  - If not found: flashes `error: "Location not found"` and redirects to `/locations`.
  - Renders `views/comments/new.ejs` with `location`.

#### `POST /locations/:id/comments`
- **Purpose**: Create a new comment on a location.
- **Auth required**: Yes.
- **Body (form-encoded)**:
  - `comment[text]` – comment text (form names arranged so `req.body.comment` is an object).
- **Behavior**:
  - Loads the parent location.
  - Creates a `Comment` from `req.body.comment`.
  - Sets:
    - `comment.author.id = req.user._id`
    - `comment.author.username = req.user.username`
  - Saves the comment.
  - Pushes comment into `location.comments` array and saves the location.
  - Flashes `success: "Comment added successfully!"`.
  - Redirects to `/locations/:id`.

#### `GET /locations/:id/comments/:comment_id/edit`
- **Purpose**: Show the edit form for a specific comment.
- **Auth required**: Yes, user must own the comment (`middleware.checkCommentOwnership`).
- **Behavior**:
  - Loads the comment by `comment_id`.
  - If not found: flashes `error: "Comment not found"` and redirects `back`.
  - Renders `views/comments/edit.ejs` with `location_id` and `comment`.

#### `PUT /locations/:id/comments/:comment_id`
- **Purpose**: Update a comment.
- **Auth required**: Yes, user must own the comment.
- **Body (form-encoded)**:
  - `comment[text]` – updated text.
- **Behavior**:
  - Runs `Comment.findByIdAndUpdate(comment_id, req.body.comment)`.
  - Flashes `success: "Comment updated successfully!"`.
  - Redirects to `/locations/:id`.

#### `DELETE /locations/:id/comments/:comment_id`
- **Purpose**: Delete a comment.
- **Auth required**: Yes, user must own the comment.
- **Behavior**:
  - Runs `Comment.findByIdAndDelete(comment_id)`.
  - Flashes `success: "Comment deleted successfully!"`.
  - Redirects to `/locations/:id`.

---

### 4. Frontend‑only interactions

Some behaviors are implemented entirely on the client and don’t introduce new backend routes:

- **Share dropdown** on `GET /locations/:id`:
  - Generates a shareable URL to the location.
  - Uses:
    - `mailto` / Gmail web compose.
    - `https://wa.me/?text=...` for WhatsApp.
    - Twitter intent, Facebook share.
    - Copy link for Instagram / generic sharing.
  - Uses `navigator.clipboard` and `window.open` in the browser.

- **Translate button** on `GET /locations/:id`:
  - Client‑side JavaScript:
    - Detects language heuristically.
    - Calls a third‑party translation API (`api.mymemory.translated.net`) to translate title, description, and comments to English.
    - Toggles between original and translated text.

