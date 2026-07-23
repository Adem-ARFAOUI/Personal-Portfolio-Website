# Adem Arfaoui — Portfolio

A redesigned, responsive, dark/light-mode portfolio with a real backend:
dynamic projects, a blog, a working contact form (real emails), and an
admin dashboard to manage all of it without touching code.

## What's inside

- **Frontend** — `public/`: a dark-first (with light mode toggle),
  responsive site. Plain HTML/CSS/JS, no build step, no framework.
- **Backend** — `server/`: a small Express API (projects, blog, contact
  form, auth, file uploads) storing data in a JSON file (`data/db.json`)
  — no database server to install or manage.
- **Admin dashboard** — `public/admin/`: log in at `/admin` to add/edit/
  delete projects and blog posts, read contact messages, and upload your CV.

```
portfolio/
├── data/db.json          # your content lives here (auto-created)
├── public/                # everything served to visitors
│   ├── index.html          # home page
│   ├── blog.html / post.html
│   ├── admin/               # admin dashboard (protected)
│   ├── css/ js/ images/
│   ├── uploads/             # images you upload from the admin panel
│   └── cv/                  # your uploaded CV PDF
├── server/                # the API
│   ├── index.js
│   ├── db.js               # tiny JSON file datastore
│   ├── routes/              # auth, projects, blog, contact, messages, upload
│   └── middleware/auth.js
├── scripts/seed.js        # creates your admin login
└── .env.example            # copy to .env and fill in
```

## 1. Local setup

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
cp .env.example .env
```

Open `.env` and fill in:

- `JWT_SECRET` — any long random string. Generate one with:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — your admin login (used once below,
  then you can remove the password from `.env` if you like).
- `SMTP_*` — optional, for the contact form to actually send you emails
  (see section 3). The site works fine without this — messages are
  always saved and visible in the admin dashboard either way.

Create your admin account:

```bash
npm run seed
```

Start the server:

```bash
npm start
```

Visit `http://localhost:3000` for the site, and `http://localhost:3000/admin`
to log in and manage content.

## 2. Using the admin dashboard

- **Projects tab** — add/edit/delete projects, upload a cover image,
  set category, tags, GitHub/live links, and mark one as "Featured".
  Tags you add here automatically become filter buttons on the site.
- **Blog tab** — write posts (plain text or simple HTML), set a cover
  image, and toggle Published/Draft. Drafts never appear on the public site.
- **Messages tab** — every contact-form submission lands here, whether
  or not email is configured, so you'll never lose one.
- **Settings tab** — upload your CV as a PDF; it's what the "Download CV"
  button on the home page links to.

## 3. Turning on real emails for the contact form

The contact form always saves messages to the admin dashboard. To also
get them emailed to you, fill in the `SMTP_*` variables in `.env`:

**Using Gmail:**
1. Turn on 2-Step Verification on your Google account.
2. Create an [App Password](https://myaccount.google.com/apppasswords).
3. Set:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=you@gmail.com
   SMTP_PASS=the-16-character-app-password
   CONTACT_TO_EMAIL=you@gmail.com
   ```

**Using another provider** (Resend, SendGrid, Mailgun, your host's SMTP,
etc.) — use the SMTP host/port/credentials they give you the same way.

Restart the server after changing `.env`.

## 4. Personalizing your info

Your name, bio, skills, and contact details (email/phone/social links)
live directly in `public/index.html` — search for your name or the
relevant text and edit it. This keeps things simple since that
information rarely changes. Everything that changes often — projects,
blog posts, CV, contact messages — is managed from `/admin` instead.

## 5. Deploying

This app is a normal Node/Express server, so it runs on any Node host:
[Render](https://render.com), [Railway](https://railway.app),
[Fly.io](https://fly.io), a VPS, etc.

General steps:
1. Push this project to a GitHub repo (`.env` is git-ignored — never commit it).
2. On your host, set the same environment variables from `.env.example`.
3. Build command: `npm install`. Start command: `npm start`.
4. After the first deploy, run `npm run seed` once (most hosts offer a
   "run command" / shell feature) to create your admin login.
5. **Important:** `data/db.json`, `public/uploads/`, and `public/cv/` need
   to persist between deploys. On most platforms this means attaching a
   persistent disk/volume to the app — otherwise your content resets on
   every redeploy. (Render, Railway, and Fly.io all support this.)

## 6. Notes on the JSON datastore

Content is stored in `data/db.json` instead of a database server like
Postgres or MongoDB — intentionally, since a portfolio's traffic and
data don't need one, and it means zero setup. If this site ever grows
into something with much heavier traffic or multiple editors, `server/db.js`
is a thin enough layer that swapping it for a real database later is
a contained change — nothing in the routes would need to change shape.

## 7. Security notes

- Admin routes are protected by a JWT stored in an httpOnly cookie —
  it isn't accessible to JavaScript in the browser.
- Passwords are hashed with bcrypt; the plaintext password is never stored.
- Login and contact-form endpoints are rate-limited to reduce abuse.
- The contact form has a hidden honeypot field to cut down on basic spam bots.
- Keep `.env` out of version control (it already is, via `.gitignore`).
