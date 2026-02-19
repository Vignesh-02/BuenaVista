# BuenaVista Documentation

Documentation for the BuenaVista travel/location sharing application.

---

## Contents

| Document                                                            | Description                                                                                |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [**Backend Flow and Structure**](./backend-flow-and-structure.md)   | Server architecture, request flow, routes, models, middleware, ImageKit, and API endpoints |
| [**Frontend Flow and Structure**](./frontend-flow-and-structure.md) | Views, templates, client-side JavaScript, styling, theming, and form flows                 |
| [**API Reference**](./api.md)                                       | Detailed route documentation with request/response formats                                 |
| [**Models and Relations**](./models-and-relations.md)               | Database schemas and relationships                                                         |
| [**Setup**](./setup.md)                                             | Installation, environment variables, and development setup                                 |

---

## Quick Reference

- **Stack:** Node.js, Express, MongoDB (Mongoose), EJS, Passport, ImageKit
- **Auth:** Session-based (Passport Local), stored in MongoDB
- **Images:** Upload to ImageKit or paste URL; extract from page links (og:image)
- **Frontend:** Server-rendered EJS + Bootstrap 5 + vanilla JS
