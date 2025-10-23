# Changelog

## [Unreleased]

### Added
- **Backend REST API**: Complete CRUD endpoints for notes, expenses, categories, income, savings with validation middleware
- **Authentication**: Google OAuth and guest mode support with session management
- **Sync & Export**: Encrypted snapshot storage, JSON/CSV export with AES-256-GCM encryption
- **Frontend Views**: Dashboard, categories, savings, income, settings, and sync interfaces
- **Offline Support**: IndexedDB storage layer and service worker for PWA capabilities
- **State Management**: Pub/sub store with auto-adjust budget logic and filter helpers
- **Utilities**: Date formatting, currency helpers, DOM utilities, encryption services
- **Drive Integration**: Google Drive upload/download scaffolding for cloud sync
- **Testing**: Initial test structure and seed data script

### Changed
- Migrated from inline validation to reusable `validateRequest()` middleware
- Enhanced category spending tracking with history and undo support
- Improved expense aggregation logic with proper total calculations
- Converted categories management to standalone modals with confirm/cancel flows and removed floating action button to match new UX
- Refined categories budget dialog with rich modal layout and currency-aware styling
- Logged manual budget adjustments in history and improved overdrawn visuals when auto-adjust is disabled
- Fixed auto-adjust preference persistence to honor user toggles across sessions
- Implemented automatic monthly budget reset with configurable starting day (1-29, defaults to 1st)
- Improved reset-day input styling to match application theme
- Removed filter chips and page title from categories view for cleaner interface

### Fixed
- Persist guest session identity to prevent local data resets on reload
- Fixed budget reset logic to prevent premature resets on first load

### Security
- End-to-end encryption for all exported and synced data
- PBKDF2 key derivation with 120k iterations
- Secure session cookies with httpOnly and sameSite flags
