# ExpenseKeeper

ExpenseKeeper is a mobile-first, offline-capable expense tracker built with vanilla HTML, CSS, and JavaScript, paired with a Node.js + Express backend.

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file with required environment variables (see below).
3. Run the development server:
   ```bash
   npm run dev
   ```

## Environment variables

- `PORT` (optional, default `3000`)
- `CLIENT_ORIGIN` (optional, default `http://localhost:3000`)
- `GOOGLE_CLIENT_ID` — OAuth client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — OAuth client secret
- `GOOGLE_REDIRECT_URI` — OAuth redirect URI (e.g., `http://localhost:3000/auth/callback`)
- `SESSION_SECRET` — Secret key for signing session cookies
- `SQLITE_PATH` (optional) — Path to SQLite database file

## Project structure

- `public/` — frontend assets (HTML, CSS, JS, icons)
- `server/` — Express server, routes, and OAuth handlers
- `scripts/` — utility scripts (e.g., database initialization)
- `tests/` — unit test harness and specs
- `docs/` — documentation such as changelog

## Deployment

### Railway (Recommended)

1. **Sign up** at [Railway.app](https://railway.app)
2. **Connect your GitHub repository**
3. **Railway will auto-detect** your Node.js app
4. **Set environment variables** in Railway dashboard:
   - `CLIENT_ORIGIN` = `https://your-app-name.up.railway.app`
   - `SESSION_SECRET` = Generate a secure random string
   - `NODE_ENV` = `production`
   - Leave other variables as default or configure as needed

5. **Deploy!** Railway will build and deploy automatically

Your app will be live at `https://your-app-name.up.railway.app`

### Environment Variables for Production

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Required for production:
- `SESSION_SECRET` — Generate a secure random string (not the default!)
- `CLIENT_ORIGIN` — Your Railway domain
- `NODE_ENV=production` — Enables security features

## Features

- **Offline-first**: IndexedDB storage and service worker for PWA support
- **Authentication**: Google OAuth and guest mode with secure session management
- **Budgeting**: Category allocations with auto-adjust logic and history tracking
- **Sync & Export**: Encrypted snapshots to Google Drive or local JSON/CSV exports
- **Savings Goals**: Track progress with optional auto-contributions
- **Dark Mode**: System-aware theme with manual override
- **Mobile-first UI**: Responsive design with swipe gesture placeholders
- **Accessibility**: ARIA labels, keyboard navigation, and semantic HTML

## Contributing

Please ensure any new feature is behind a feature flag and documented in `docs/CHANGELOG.md` following semantic versioning.
