# ⚡ Energy Tracker — Node.js web app

Register with email or Google, fill in a profile, add properties (name, address, people, devices)
and log electricity consumption per **month**, **year** or **custom date range** with kWh and amount paid.

**Stack:** Express (web framework) · EJS (pages) · Passport (email + Google login) · SQLite via better-sqlite3 (database, no server needed) · bcrypt (password hashing)

---

## Step 1 — Install Node.js
Install Node.js **22 or newer** (LTS) from https://nodejs.org, then check: `node -v`

## Step 2 — Get the code and install packages
```bash
cd energy-app
npm install
```

## Step 3 — Configure
```bash
cp .env.example .env
```
Open `.env` and set `SESSION_SECRET` to a long random string, e.g. output of:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Step 4 — Run
```bash
npm run dev      # auto-restarts on file changes
# or
npm start
```
Open http://localhost:3000 → Register → fill your profile → add a property → add consumption.
The database file `energy.db` is created automatically on first start.

## Step 5 — Enable Google login (optional)
1. Go to https://console.cloud.google.com → create a project.
2. **APIs & Services → OAuth consent screen**: choose *External*, fill app name + your email, add yourself as a test user.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → *Web application*.
4. Authorized redirect URI: `http://localhost:3000/auth/google/callback`
5. Copy the Client ID and Secret into `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) and restart.
The "Continue with Google" button appears automatically. If a Google email matches an existing
email account, they're linked into one account.

## Step 6 — Deploy (when ready)
Any Node host works (Render, Railway, Fly.io, a VPS). Set the same env vars, plus:
- `BASE_URL=https://your-domain.com` and add `https://your-domain.com/auth/google/callback` in Google Console
- Use a persistent disk for `energy.db` (or set `DB_FILE` to a path on it)
- Run behind HTTPS and add `app.set('trust proxy', 1)` + `cookie.secure: true` in `src/server.js`

---

## Project structure
```
src/
  server.js         app setup, sessions, routes
  db.js             SQLite connection + tables
  auth.js           Passport strategies (email/password + Google)
  routes/auth.js    register, login, Google, logout
  routes/app.js     profile, dashboard, properties, consumption
views/              EJS pages
public/style.css    styling
```

## Data model
| Table | Fields |
|---|---|
| users | email, password_hash, google_id, full_name, phone, country, currency |
| properties | user_id, name, address, residents, devices, notes |
| consumptions | property_id, period_type (month/year/range), start_date, end_date, kwh, amount_paid, notes |

Month and year entries are stored as real start/end dates (e.g. Feb 2026 → 2026-02-01 to 2026-02-28),
so you can later compare or chart any period consistently.

## Ideas for next steps
- Charts of kWh and cost over time (Chart.js)
- Edit existing consumption entries
- Password reset by email (nodemailer)
- CSRF protection (`csrf-sync`) and rate limiting on login (`express-rate-limit`) before going public
