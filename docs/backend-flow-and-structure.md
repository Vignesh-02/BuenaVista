# Backend Flow and Structure

This document describes the server-side architecture, request flow, and structure of the BuenaVista application.

---

## Overview

BuenaVista is a **Node.js + Express** application with **MongoDB** (via Mongoose). It uses server-side rendering with **EJS** templates, session-based authentication via **Passport.js**, and file uploads to **ImageKit**.

---

## Project Structure

```
buenaVista/
├── app.js              # Express app entry, middleware, route mounting
├── db.js               # MongoDB connection
├── models/             # Mongoose schemas
│   ├── user.js         # User (auth)
│   ├── location.js     # Location (called "Campground" in DB)
│   └── comment.js      # Comment
├── routes/             # Route handlers
│   ├── index.js        # Auth, landing
│   ├── locations.js    # Locations CRUD, upload, extract, likes API
│   └── comments.js     # Comments CRUD (nested under locations)
├── middleware/         # Custom middleware
│   └── index.js        # isLoggedIn, checkLocationOwnership, checkCommentOwnership
├── lib/               # Third-party integrations
│   └── imagekit.js     # ImageKit upload & display URL helper
└── utils/
    └── validation.js  # Registration & login validation
```

---

## Request Flow

```
HTTP Request
    ↓
Express middlewares (in order):
    1. express.urlencoded()      → parse form body
    2. express.json()            → parse JSON body
    3. express.static("public")  → serve static files
    4. methodOverride("_method") → support PUT/DELETE via POST
    5. flash()                   → flash messages
    6. session (MongoStore)      → session persistence
    7. passport.initialize()
    8. passport.session()
    9. Custom: res.locals (currentUser, error, success)
    ↓
Router (index, locations, comments)
    ↓
Controller logic (DB queries, validation)
    ↓
res.render() or res.redirect() or res.json()
```

---

## Core Modules

### `app.js`

- **Entry point** when run directly; requires `db.js` and starts the server.
- **Exports `{ app }`** for tests (supertest).
- **Configuration**:
    - `express.urlencoded` + `express.json` for request bodies
    - `trust proxy: true` in production (for correct `req.protocol` behind HTTPS)
    - EJS as view engine
    - Static files from `/public`
    - Method override for `_method` (PUT, DELETE via POST)
- **Session**: MongoStore with 14-day TTL, secure cookies in production.
- **Passport**: Local strategy using `User.authenticate()` from passport-local-mongoose.
- **Globals for templates**:
    - `res.locals.currentUser` — logged-in user or undefined
    - `res.locals.error`, `res.locals.success` — flash messages
    - `app.locals.moment` — date formatting
    - `app.locals.getDisplayImageUrl` — ImageKit display URL helper

### `db.js`

- Connects to MongoDB using `process.env.MONGODB_URL`.
- In test mode, `MONGODB_URL` is set by Jest (mongodb-memory-server).

---

## Models

### User (`models/user.js`)

- **Schema**: `username` (5–30 chars, alphanumeric + underscore), `password` (hashed by plugin).
- **Plugin**: `passport-local-mongoose` for `User.register()`, `User.authenticate()`.

### Location (`models/location.js`)

- **DB name**: `Campground` (legacy).
- **Fields**: `name`, `image` (URL string), `description`, `author` (ref User), `comments` (ref Comment[]), `likes` (number), `likedBy` (ref User[]).
- **Timestamps**: `createdAt`, `updatedAt`.

### Comment (`models/comment.js`)

- **Fields**: `text`, `author` (ref User), `createdAt`.
- **Relationship**: Linked to `Location` via `location.comments` array.

---

## Routes

### Index (`routes/index.js`)

| Method | Path      | Purpose                  | Auth |
| ------ | --------- | ------------------------ | ---- |
| GET    | /         | Landing page             | No   |
| GET    | /register | Registration form        | No   |
| POST   | /register | Create user, log in      | No   |
| GET    | /login    | Login form               | No   |
| POST   | /login    | Authenticate             | No   |
| GET    | /logout   | Log out, destroy session | Yes  |

### Locations (`routes/locations.js`)

| Method | Path                               | Purpose                         | Auth |
| ------ | ---------------------------------- | ------------------------------- | ---- |
| GET    | /locations                         | List all locations              | No   |
| GET    | /locations/api/likes               | JSON like counts for index      | No   |
| POST   | /locations                         | Create location                 | Yes  |
| POST   | /locations/upload-image            | Upload image to ImageKit (JSON) | Yes  |
| POST   | /locations/extract-image-from-link | Extract og:image from URL       | Yes  |
| GET    | /locations/new                     | New location form               | Yes  |
| GET    | /locations/:id                     | Show location + comments        | No   |
| POST   | /locations/:id/like                | Toggle like (HTML or JSON)      | Yes  |
| GET    | /locations/:id/edit                | Edit form (owner only)          | Yes  |
| PUT    | /locations/:id                     | Update (owner only)             | Yes  |
| DELETE | /locations/:id                     | Delete (owner only)             | Yes  |

### Comments (`routes/comments.js`)

Mounted at `/locations/:id/comments`.

| Method | Path                                     | Purpose          | Auth  |
| ------ | ---------------------------------------- | ---------------- | ----- |
| GET    | /locations/:id/comments/new              | New comment form | Yes   |
| POST   | /locations/:id/comments                  | Create comment   | Yes   |
| GET    | /locations/:id/comments/:comment_id/edit | Edit form        | Owner |
| PUT    | /locations/:id/comments/:comment_id      | Update comment   | Owner |
| DELETE | /locations/:id/comments/:comment_id      | Delete comment   | Owner |

---

## Middleware (`middleware/index.js`)

- **`isLoggedIn`**: Redirects to `/login` if `!req.isAuthenticated()`.
- **`checkLocationOwnership`**: Verifies `location.author.id` equals `req.user._id` before edit/delete.
- **`checkCommentOwnership`**: Same check for comments.

---

## Lib: ImageKit (`lib/imagekit.js`)

### `uploadLocationImage(fileBuffer, fileName, mimeType)`

- Uploads a buffer to ImageKit in the `locations` folder.
- Uses `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_URL` from env.
- Returns `{ url }` — public URL of the uploaded image.

### `getDisplayImageUrl(url, options)`

- **ImageKit URLs**: Applies transform (`tr:w-640,q-90` for show, `tr:w-400,q-85` for thumb).
- **External URLs**: Returns as-is unless `IMAGEKIT_USE_WEB_PROXY=true`.
- Used in EJS via `app.locals.getDisplayImageUrl`.

---

## API Endpoints (JSON)

### `POST /locations/upload-image`

- **Body**: `multipart/form-data` with `image` file.
- **Response**: `{ url: "https://..." }` or `{ error: "..." }`.
- **Errors**: 400 (no file, too large, wrong type), 403 (ImageKit auth), 500.

### `POST /locations/extract-image-from-link`

- **Body**: `{ url: "https://..." }`.
- **Handles**:
    - Google Images: `imgurl` query param.
    - Other sites: Fetch HTML, parse `og:image` / `twitter:image` via Cheerio.
- **Response**: `{ imageUrl: "https://..." }` or `{ error: "..." }`.

### `GET /locations/api/likes`

- **Response**: `{ "<locationId>": <number>, ... }`.

### `POST /locations/:id/like`

- **Accept: application/json** → Returns `{ likes, liked }`.
- **Accept: text/html** → Redirects to the location page.

---

## Environment Variables

| Variable               | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| MONGODB_URL            | MongoDB connection string                |
| SESSION_SECRET         | Session signing (required in prod)       |
| IMAGEKIT_PRIVATE_KEY   | ImageKit server API key                  |
| IMAGEKIT_PUBLIC_KEY    | ImageKit public key                      |
| IMAGEKIT_URL           | ImageKit URL endpoint                    |
| IMAGEKIT_USE_WEB_PROXY | Optional web proxy for external URLs     |
| PORT                   | Server port (default 5004)               |
| NODE_ENV               | `development` \| `production` \| `test`  |
| USE_HTTPS              | Set to `false` if behind non-HTTPS proxy |

---

## Error Handling

- **Validation errors**: Flash message + redirect back.
- **DB/404**: Flash error + redirect to `/locations` or `back`.
- **Upload/extract errors**: JSON `{ error: "..." }` with appropriate status.
- **Multer errors**: Handled in routes (file size, MIME type).
