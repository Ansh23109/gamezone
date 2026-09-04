Deployment checklist for GameZone

1) Add DATABASE_URL to Vercel

- Open your Vercel dashboard and select the project `gamezone`.
- Settings → Environment Variables.
- Add variable `DATABASE_URL` with your Postgres connection string. Example:
  - `postgres://username:password@host:5432/database_name?sslmode=require`
- Set the Environment to `Production` (and `Preview` if you want preview deployments to access the DB).
- Click Save and redeploy (either push a commit or use the "Redeploy" button on the latest deployment).

2) Check Deployment & Runtime Logs

- Deployments → select the deployment → check Build Logs for failures during `next build`.
- In the deployment details, open Function / Server logs for runtime errors (500s) when pages render.
- Observability → Logs: search for error messages or the string `Dashboard data load failed` which we added to help visibility.
- (Optional) Using Vercel CLI: `npx vercel@latest login` then `npx vercel logs <deployment-url> --since 1h`.

3) Local reproduction (recommended)

- Ensure Node is installed locally. On macOS you can use Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node
```

- From the repo root:

```bash
cd /Users/anshkashyap/Downloads/gamezone
npm ci
DATABASE_URL="postgres://user:pass@host:5432/dbname?sslmode=require" npm run build
DATABASE_URL="postgres://user:pass@host:5432/dbname?sslmode=require" npm start
# or for dev
DATABASE_URL="..." npm run dev
```

4) Quick debugging tips

- If the site is blank on Vercel but the build succeeded, open the deployment runtime logs — it's usually a server runtime error (missing env var or DB connection failure).
- If you see an error like `No DATABASE_URL configured`, add the env var and redeploy.
- For connection issues, verify host allows connections from Vercel (network/allowlist), correct credentials, and SSL settings.

5) If you want, I can:
- Provide a small commit that replaces the yellow banner with a friendly static landing page (so the site looks like a homepage when DB is not configured).
- Walk you through adding the env var in your Vercel account step-by-step while you share the screen.
