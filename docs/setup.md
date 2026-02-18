## BuenaVista – Local Setup Guide

This guide explains how to run the BuenaVista project on your own machine, including tests and tooling. It assumes a macOS/Linux environment, but the commands are very similar on Windows (PowerShell).

---

### 1. Prerequisites

- **Node.js**: v20.x recommended (same as CI).
    - Check: `node -v`
- **npm**: comes with Node.js.
    - Check: `npm -v`
- **MongoDB**:
    - For development:
        - Either have a local MongoDB instance listening on `mongodb://127.0.0.1:27017`,
        - Or provision a remote MongoDB URI.
    - For tests:
        - Jest uses an **in‑memory MongoDB** (`mongodb-memory-server`), so no external DB is needed for tests.
- **Git**: to clone the repository.

Optional but helpful:

- **Docker**: if you prefer to run MongoDB in a container.
- A modern IDE (VS Code, WebStorm) with ESLint and Prettier plugins.

---

### 2. Clone the repository

```bash
cd ~/dev/nodeprojects
git clone <your-fork-or-repo-url> buenaVista
cd buenaVista
```

If you are already in this directory, you can skip cloning.

---

### 3. Install dependencies

```bash
npm install
```

This installs:

- Runtime deps: `express`, `mongoose`, `passport`, `ejs`, etc.
- Test deps: `jest`, `supertest`, `mongodb-memory-server`, `@playwright/test`.
- Tooling: `eslint`, `prettier`, `nodemon`.

---

### 4. Environment configuration

Create a `.env` file in the project root (if it doesn’t exist yet). Example:

```env
MONGODB_URL=mongodb://127.0.0.1:27017/buenavista-dev
SESSION_SECRET=dev-secret-key-change-me
PORT=5000
```

Notes:

- **MONGODB_URL**:
    - Used only in non‑test environments.
    - Must point to a MongoDB instance you control (local or remote).
- **SESSION_SECRET**:
    - Used to sign session cookies.
    - Use a strong, random string in real deployments.
- **PORT**:
    - Defaults to `5000` if not set.

In **tests**, `jest.setup.js` sets `NODE_ENV=test` and `MONGODB_URL` to the in‑memory MongoDB URI; `.env` is **not** loaded to avoid hitting a real DB.

---

### 5. Running the app in development

For a one‑off run:

```bash
npm start
```

This runs:

- `node app.js`
- App listens on `http://localhost:5000` (or `PORT` from `.env`).

For auto‑reload during coding:

```bash
npm run dev
```

This runs:

- `nodemon app.js` – restarts the server when files change.

Visit:

- `http://localhost:5000/` – landing page.
- `http://localhost:5000/register` – sign up.
- `http://localhost:5000/login` – log in.
- `http://localhost:5000/locations` – list of locations.

---

### 6. Running tests

#### 6.1 Unit & integration tests (Jest)

```bash
npm test
```

Configuration:

- `jest.config.js` – base Jest config.
- `jest.setup.js` – starts `mongodb-memory-server` and sets `NODE_ENV=test`:
    - Ensures tests never connect to your real MongoDB.
    - `app.js` respects this and doesn’t load `.env` in test mode.

Tests live under `__tests__/`:

- `__tests__/utils/validation.test.js` – validation logic.
- `__tests__/middleware/auth.test.js` – auth middleware.
- `__tests__/routes/*.integration.test.js` – routes & pages.

To run in watch mode:

```bash
npm run test:watch
```

#### 6.2 End‑to‑End (E2E) tests (Playwright)

First‑time setup (download browsers):

```bash
npx playwright install --with-deps chromium
```

Run E2E tests:

```bash
npm run test:e2e
```

Playwright configuration:

- `playwright.config.js`:
    - `testDir: "__tests__/e2e"`
    - `webServer.command: "node scripts/start-e2e-server.js"`
    - Base URL: `http://localhost:5000` (or `PORT` env).

E2E server script:

- `scripts/start-e2e-server.js`:
    - Starts an in‑memory MongoDB.
    - Sets `NODE_ENV=test` and `MONGODB_URL` for the app.
    - Spawns `node app.js`.

This means E2E tests run in a clean, disposable environment and **do not** hit your dev or prod databases.

---

### 7. Linting & formatting

#### ESLint

Run ESLint:

```bash
npm run lint
```

Auto‑fix:

```bash
npm run lint:fix
```

Configuration:

- `.eslintrc.cjs`:
    - `env: { node: true, es2021: true, jest: true }`
    - `extends: ["eslint:recommended", "prettier"]`
    - Ignores `node_modules`, `coverage`, Playwright outputs, `public/`.

#### Prettier

Check formatting:

```bash
npm run format:check
```

Format all files:

```bash
npm run format
```

Configuration:

- `.prettierrc` – semicolons on, double quotes, 4‑space indent, `printWidth: 100`.
- `.prettierignore` – excludes `node_modules`, `coverage`, `public`, Playwright outputs, lockfile, etc.

---

### 8. CI & SonarCloud (for a production‑like setup)

GitHub Actions workflow: `.github/workflows/main.yml`:

- **`lint` job**:
    - Runs `npm ci`, `npm run lint`, `npm run format:check`.
- **`test` job**:
    - Depends on `lint`.
    - Runs Jest tests and Playwright E2E tests.
- **`sonar` job** (optional):
    - Runs SonarCloud scan if `SONAR_TOKEN` secret is configured.
    - Uses `sonar-project.properties` for project/org configuration.

To enable SonarCloud:

1. Create/confirm the project in SonarCloud.
2. Set `sonar.organization`, `sonar.projectKey`, and `sonar.host.url` in `sonar-project.properties`.
3. Add `SONAR_TOKEN` as a repo secret in GitHub.

CI will then:

- Lint & format‑check.
- Run unit/integration + E2E tests.
- Run a quality scan and report back to GitHub.

---

### 9. Summary of common commands

```bash
# Install deps
npm install

# Start dev server
npm run dev

# Run Jest tests
npm test

# Run Jest in watch mode
npm run test:watch

# Run Playwright E2E tests
npm run test:e2e

# Lint & format
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

With this setup, a new developer can clone the repo, configure `.env`, run a single `npm install`, and then immediately run the app and all tests in an environment that closely matches your CI and production practices.
