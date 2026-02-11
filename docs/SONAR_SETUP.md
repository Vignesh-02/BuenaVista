# SonarCloud setup (optional)

The CI workflow runs a **SonarCloud** scan after tests pass. To enable it:

1. **Sign in**: Go to [sonarcloud.io](https://sonarcloud.io) and sign in with GitHub.

2. **Add the project**: Choose **Analyze new project** → select this repo → pick **With GitHub Actions** when asked for analysis method. SonarCloud will show you:
    - `sonar.organization` (e.g. your GitHub username or org)
    - `sonar.projectKey` (e.g. `your-org_buenavista`)

3. **Update `sonar-project.properties`** in the repo root: set `sonar.organization` and `sonar.projectKey` to the values from step 2.

4. **Create a token**: In SonarCloud → **My Account** → **Security** → **Generate Tokens**. Copy the token.

5. **Add GitHub secret**: In this repo on GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Name: `SONAR_TOKEN`, Value: the token from step 4.

After that, every push and pull request (from the same repo) will run the SonarCloud scan. You can add the **SonarCloud Quality Gate** as a required status check on `main` so merges are blocked if the gate fails.

If you don’t set up SonarCloud, the `sonar` job is skipped when `SONAR_TOKEN` is not set, so CI still passes.
