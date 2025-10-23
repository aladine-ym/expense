# App Simplification - Single User Mode

## Date: October 16, 2025

### Overview
Converted ExpenseKeeper from a multi-user app with Google authentication to a **single-user local application**.

---

## Changes Made

### ✅ 1. Authentication Simplified
**Before:** Guest users + Google OAuth  
**After:** Single local user (auto-login)

**Changes:**
- Removed guest user creation logic
- Removed Google OAuth integration
- Created fixed user ID: `local-user`
- Auto-login on app start (no login screen)

**Files Modified:**
- `server/routes/auth.js` - Simplified to auto-login endpoint
- `public/js/utils/api.js` - Removed guest identity caching
- **Deleted:** `server/services/google-oauth.js`

---

### ✅ 2. Google Drive Sync Removed
**Before:** Optional Google Drive sync for backups  
**After:** Local-only storage

**Changes:**
- Removed sync routes and views
- Removed Google Drive service integration
- Removed sync navigation button

**Files Modified:**
- `server/routes/index.js` - Removed sync router
- `public/js/main.js` - Removed sync view import and routing
- `public/index.html` - Removed sync navigation button
- **Deleted:** `server/services/drive.js`
- **Deleted:** `server/routes/sync.js`
- **Deleted:** `public/js/views/sync.js`

---

### ✅ 3. Data Migration
**Action:** Migrated all existing data to single user

**Results:**
- ✅ Migrated 33 categories
- ✅ Migrated 13 expenses
- ✅ Migrated 2 day notes
- ✅ Migrated 1 income source
- ✅ Migrated 1 savings goal
- ✅ Migrated 11 category history entries
- ✅ Deleted 14 old user accounts

**Single User ID:** `local-user`

---

### ✅ 4. Dependencies Cleaned
**Removed from package.json:**
- `googleapis` (^135.0.0) - No longer needed
- `node-fetch` (^3.3.2) - Was only used for Google APIs

**Remaining Dependencies:**
- `express` - Web server
- `sqlite3` - Database
- `jsonwebtoken` - Session tokens
- `express-session` - Session management
- `cookie-parser` - Cookie handling
- `cors` - CORS middleware
- `morgan` - HTTP logging
- `nanoid` - ID generation
- `json2csv` - CSV export

---

## How It Works Now

### 1. **App Startup**
```
User opens app
    ↓
Auto-login to local-user
    ↓
Load categories, notes, expenses
    ↓
Display dashboard
```

### 2. **Session Management**
- Single user session created automatically
- Session persists via HTTP-only cookies
- No login/logout needed

### 3. **Data Storage**
- All data stored in local SQLite database
- Single user owns all data
- No cloud sync or backups

---

## Navigation Structure

**Before:**
- Dashboard
- Income
- Categories
- Savings
- Settings
- ~~Sync~~ ❌

**After:**
- Dashboard
- Income
- Categories
- Savings
- Settings

---

## API Endpoints

### Removed:
- ❌ `POST /api/auth/google` - Google OAuth
- ❌ `POST /api/auth/guest` - Guest login
- ❌ `POST /api/auth/logout` - Logout
- ❌ `GET /api/sync/snapshots` - List sync snapshots
- ❌ `POST /api/sync/snapshots` - Create snapshot
- ❌ `POST /api/sync/restore` - Restore from snapshot

### Added:
- ✅ `POST /api/auth/auto-login` - Auto-login to local user

### Unchanged:
- `GET /api/user` - Get current user
- `GET /api/categories` - List categories
- `GET /api/notes` - List notes
- `POST /api/notes` - Create note/expense
- `GET /api/income` - List income sources
- `GET /api/savings` - List savings goals
- `POST /api/export/json` - Export JSON
- `POST /api/export/csv` - Export CSV

---

## Database Schema

**No changes to schema** - All tables remain the same.

**User Table:**
- Now contains only 1 user: `local-user`
- `authProvider` set to `'local'`
- All data linked to this single user

---

## Benefits

### ✅ Simplicity
- No authentication flow
- No user management
- Instant app startup

### ✅ Privacy
- No external services
- No cloud dependencies
- Fully local data

### ✅ Performance
- Faster startup (no OAuth checks)
- No network requests for auth
- Reduced complexity

### ✅ Maintenance
- Fewer dependencies
- Less code to maintain
- Simpler debugging

---

## Testing Checklist

- [x] App starts without errors
- [x] Auto-login creates/finds local-user
- [x] Categories load correctly
- [x] Expenses load correctly
- [x] Navigation works (no sync button)
- [x] Data persists across sessions
- [x] Export functionality still works

---

## Migration Notes

If you need to restore the old multi-user functionality:
1. Restore deleted files from git history
2. Revert changes to `auth.js` and `api.js`
3. Add back `googleapis` dependency
4. Restore sync routes and views

---

## Environment Variables

**No longer needed:**
- ~~GOOGLE_CLIENT_ID~~
- ~~GOOGLE_CLIENT_SECRET~~
- ~~GOOGLE_REDIRECT_URI~~

**Still required:**
- `PORT` - Server port (default: 3000)
- `SESSION_SECRET` - Session encryption key
- `SQLITE_PATH` - Database file path (optional)

---

## Next Steps

1. ✅ Test the app thoroughly
2. Consider adding local backup/restore feature
3. Consider adding data import from CSV
4. Update README.md to reflect changes
5. Remove unused environment variables from `.env`

---

**Status:** ✅ Complete  
**App Mode:** Single-user local-only  
**All data migrated:** 33 categories, 13 expenses, 2 notes
