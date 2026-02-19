# Frontend Flow and Structure

This document describes the client-side architecture, views, templates, and interactive behavior of the BuenaVista application.

---

## Overview

BuenaVista uses **server-side rendering** with **EJS** templates. The frontend is a mix of:
- **Static HTML** rendered by the server
- **Bootstrap 5** for layout and components
- **Bootstrap Icons** for UI icons
- **Inline/embedded JavaScript** for forms, likes, sharing, and image handling
- **CSS variables** for theming (light/dark)

There is no separate frontend framework (React, Vue, etc.); all client logic lives in `<script>` blocks within EJS views.

---

## Project Structure

```
views/
├── landing.ejs           # Home page (marketing)
├── register.ejs          # Sign-up form
├── login.ejs             # Sign-in form
├── partials/
│   ├── header.ejs        # Navbar, theme toggle, auth links
│   └── footer.ejs        # Footer links
├── locations/
│   ├── index.ejs         # List of location cards
│   ├── new.ejs           # Add location form (upload, paste URL, extract)
│   ├── edit.ejs          # Edit location form (same image options)
│   └── show.ejs          # Single location, comments, like, share, translate
└── comments/
    ├── new.ejs           # Add comment form
    └── edit.ejs          # Edit comment form

public/
├── stylesheets/
│   ├── main.css          # App styles, theme vars, components
│   └── landing.css       # Landing page specific
├── favicon.svg           # SVG favicon
├── favicon.png           # PNG fallback (generated)
└── site.webmanifest      # PWA manifest
```

---

## Template Flow

### Layout Pattern

Most pages use a shared layout:

```ejs
<%- include("../partials/header"); %>
<!-- Page content -->
<%- include("../partials/footer"); %>
```

- **Header**: Navbar with logo, Home, Explore, Add Location (if logged in), theme toggle, Login/Register or username + Sign Out.
- **Footer**: Links to Explore, Add Location, theme toggle.

### Data Available in All Views

These are set by Express middleware or route handlers:

| Variable      | Type   | Description                    |
|---------------|--------|--------------------------------|
| `currentUser` | User?  | Logged-in user or undefined    |
| `error`      | Array  | Flash error messages           |
| `success`    | Array  | Flash success messages         |
| `moment`     | Function | Date formatting (app.locals) |

### Page-Specific Data

| View             | Data Passed              |
|------------------|--------------------------|
| locations/index  | `locations`              |
| locations/new    | —                        |
| locations/edit   | `location`               |
| locations/show   | `location` (with populated comments) |
| comments/new     | `location`               |
| comments/edit    | `location`, `comment`, `location_id` |

---

## Styling and Theming

### CSS Architecture

- **Bootstrap 5** provides grid, utilities, and components.
- **Custom CSS** in `main.css` and `landing.css`:
  - CSS variables for colors, backgrounds, borders
  - `.btn-camp-primary`, `.btn-camp-secondary`, etc.
  - Theme classes for light/dark via `data-theme`

### Theme Toggle

- Stored in `localStorage` as `theme` (`light` | `dark`).
- Initialized on load from `localStorage` or `prefers-color-scheme`.
- Toggle button updates `document.documentElement.setAttribute('data-theme', theme)`.
- CSS variables switch based on `[data-theme="dark"]` selectors.

---

## Client-Side JavaScript Flows

### 1. Image Upload (new.ejs, edit.ejs)

**Flow:**
1. User clicks "Upload image" → hidden file input opens.
2. User selects file → client validates type (JPEG/PNG/GIF/WebP) and size (max 5 MB).
3. `FormData` with `image` file sent to `POST /locations/upload-image`.
4. On success: response `{ url }` → hidden `#imageUrl` input set, preview shown.
5. On error: alert with message.

### 2. Extract Image from Link (new.ejs, edit.ejs)

**Flow:**
1. User pastes URL in "Or paste a link" input.
2. User clicks "Use link" button.
3. `POST /locations/extract-image-from-link` with `{ url }` (JSON).
4. Server fetches page, parses `og:image` / `twitter:image` (or Google `imgurl`).
5. On success: `{ imageUrl }` → set hidden input and preview.
6. On error: alert.

**Direct paste:** If user pastes a direct image URL in the input, `input`/`change` handlers call `setImageUrl(value)` so the preview updates without the button.

### 3. Like Button (show.ejs)

**Flow:**
1. User clicks like button.
2. `POST /locations/:id/like` with `Accept: application/json`, `credentials: "same-origin"`.
3. Response `{ likes, liked }` → update count and heart icon.
4. On 401 → redirect to `/login`.

### 4. Like Counts on Index (index.ejs)

**Flow:**
1. On load (and on `pageshow` for back-forward cache): `GET /locations/api/likes`.
2. Response `{ "<id>": count, ... }` → update each card’s `.likes-num`.

### 5. Share Menu (show.ejs)

**Flow:**
1. User clicks share option (Gmail, WhatsApp, Twitter, Facebook, Instagram, Copy link).
2. Each option opens a share URL or copies link to clipboard.
3. Uses `data-location-id` and `data-location-name` from the card for URL and text.

### 6. Translate (show.ejs)

- Uses a translation API (or placeholder) to translate location name, description, and comments.
- Button shows spinner during request; on success, text is replaced inline.

---

## Form Submissions

### Location Create (`new.ejs`)

- **Action:** `POST /locations`
- **Method:** `POST`
- **Body:** `name`, `image` (hidden, set by upload or paste), `description`
- **Redirect:** `/locations` on success

### Location Update (`edit.ejs`)

- **Action:** `PUT /locations/:id` (via `_method` override)
- **Body:** `group[name]`, `group[image]`, `group[description]`
- **Redirect:** `/locations/:id` on success

### Comment Create (`comments/new.ejs`)

- **Action:** `POST /locations/:id/comments`
- **Body:** `comment[text]`
- **Redirect:** `/locations/:id` on success

### Comment Update (`comments/edit.ejs`)

- **Action:** `PUT /locations/:id/comments/:comment_id`
- **Body:** `comment[text]`
- **Redirect:** `/locations/:id` on success

---

## Image Display

### Server-Side Helper

Templates use `getDisplayImageUrl(url, options)`:

```ejs
<img src="<%= getDisplayImageUrl(location.image, { size: 'show' }) %>" ...>
```

- **Show page:** `size: 'show'` → 640px, q90 (for ImageKit URLs).
- **Index cards:** `size: 'thumb'` → 400px, q85.
- **External URLs:** Returned as-is (or through ImageKit proxy if configured).

### Placeholder

If no image URL: placeholder image or icon (e.g. picsum or inline SVG) can be used.

---

## Accessibility and UX

- **Theme:** Respects `prefers-color-scheme`; toggle has `aria-label`.
- **Flash messages:** Shown as toasts/alerts after redirect.
- **Loading states:** Spinners on upload and "Use link" buttons.
- **Error handling:** Alerts for failed uploads, extract, or like; redirect to login on 401.

---

## Dependencies (Frontend)

| Source           | Purpose                    |
|------------------|----------------------------|
| Bootstrap 5 (CDN)| Layout, components, utilities |
| Bootstrap Icons (CDN) | Icons              |
| Google Fonts     | Outfit, Playfair Display   |
| Custom CSS       | Theme variables, overrides|
| Vanilla JS       | No frontend framework      |

---

## Browser Support

- Modern browsers with ES6+ support (fetch, async/await, template literals).
- Session cookies and `credentials: "same-origin"` for authenticated requests.
