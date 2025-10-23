# ExpenseKeeper - Project Description

## 📋 Overview

**ExpenseKeeper** is a modern, mobile-first expense tracking application designed for personal finance management. It combines a lightweight vanilla JavaScript frontend with a robust Node.js backend, offering offline-first capabilities, end-to-end encryption, and cloud synchronization through Google Drive.

## 🎯 Project Goals

- **Simplicity**: Intuitive interface for quick expense entry and budget tracking
- **Privacy**: End-to-end encryption for all synced and exported data
- **Accessibility**: Mobile-first responsive design with full keyboard navigation
- **Offline-first**: Progressive Web App (PWA) with IndexedDB storage and service worker caching
- **Flexibility**: Support for multiple income sources, savings goals, and budget categories

## 🏗️ Architecture

### Frontend Architecture

**Technology Stack:**
- **Vanilla JavaScript (ES6+)**: No frameworks, pure modern JavaScript with ES modules
- **HTML5**: Semantic markup with ARIA labels for accessibility
- **CSS3**: Custom properties (CSS variables) for theming, Grid and Flexbox layouts
- **Service Worker**: Offline caching and PWA capabilities
- **IndexedDB**: Client-side storage for offline data persistence

**Design Patterns:**
- **Pub/Sub State Management**: Custom lightweight store with reactive subscriptions
- **Component-based Views**: Modular view rendering functions
- **Utility-first Helpers**: Reusable DOM manipulation, date formatting, and currency utilities
- **Progressive Enhancement**: Works without JavaScript for core content

**Frontend Structure:**
```
public/
├── index.html              # Main app shell
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker for offline support
├── css/
│   └── styles.css          # Global styles with CSS variables
├── js/
│   ├── main.js             # App entry point and routing
│   ├── config/
│   │   └── featureFlags.js # Feature toggle configuration
│   ├── state/
│   │   └── store.js        # Centralized state management
│   ├── views/              # View rendering modules
│   │   ├── dashboard.js
│   │   ├── categories.js
│   │   ├── savings.js
│   │   ├── income.js
│   │   ├── settings.js
│   │   └── sync.js
│   ├── ui/
│   │   └── toast.js        # Toast notification system
│   ├── utils/              # Utility functions
│   │   ├── dom.js
│   │   ├── date.js
│   │   └── currency.js
│   ├── storage/
│   │   └── indexeddb.js    # IndexedDB wrapper
│   └── pwa/
│       └── register-sw.js  # Service worker registration
└── icons/                  # PWA icons
```

### Backend Architecture

**Technology Stack:**
- **Node.js (v18+)**: JavaScript runtime
- **Express.js**: Web application framework
- **SQLite3**: Embedded relational database
- **Google APIs**: OAuth 2.0 and Drive integration
- **Crypto (Node.js)**: AES-256-GCM encryption for data export/sync

**Design Patterns:**
- **RESTful API**: Resource-based endpoints with standard HTTP methods
- **Middleware Pipeline**: Authentication, validation, error handling
- **Repository Pattern**: Database abstraction layer
- **Service Layer**: Business logic separation (encryption, Drive operations)

**Backend Structure:**
```
server/
├── index.js                # Server entry point
├── app.js                  # Express app configuration
├── db/
│   ├── connection.js       # SQLite connection and migrations
│   └── schema.sql          # Database schema
├── routes/                 # API endpoints
│   ├── auth.js             # OAuth and session management
│   ├── user.js             # User preferences
│   ├── notes.js            # Expenses and day notes
│   ├── categories.js       # Budget categories
│   ├── income.js           # Income sources
│   ├── savings.js          # Savings goals
│   ├── sync.js             # Cloud sync snapshots
│   └── export.js           # Data export (JSON/CSV)
├── middleware/
│   ├── auth.js             # Authentication middleware
│   └── validate.js         # Request validation
├── utils/
│   ├── db.js               # Database query helpers
│   ├── errors.js           # Error handling utilities
│   └── encryption.js       # AES-256-GCM encryption
├── services/
│   ├── drive.js            # Google Drive API integration
│   └── google-oauth.js     # OAuth client configuration
└── scripts/
    └── seed.js             # Database seeding script
```

## 🔧 Technology Stack Details

### Core Technologies

#### **Frontend**
| Technology | Version | Purpose |
|------------|---------|---------|
| JavaScript | ES6+ | Core application logic |
| HTML5 | - | Semantic markup |
| CSS3 | - | Styling and theming |
| Service Worker | - | Offline caching |
| IndexedDB | - | Client-side storage |
| Web Crypto API | - | Client-side encryption (planned) |

#### **Backend**
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥18.0.0 | Runtime environment |
| Express | ^4.19.2 | Web framework |
| SQLite3 | ^5.1.7 | Database |
| googleapis | ^135.0.0 | Google Drive & OAuth |
| nanoid | ^5.0.7 | ID generation |
| jsonwebtoken | ^9.0.2 | JWT tokens |
| json2csv | ^5.0.7 | CSV export |
| express-session | ^1.17.3 | Session management |
| cookie-parser | ^1.4.6 | Cookie parsing |
| morgan | ^1.10.0 | HTTP logging |
| cors | ^2.8.5 | CORS middleware |

#### **Development Tools**
| Tool | Version | Purpose |
|------|---------|---------|
| nodemon | ^3.1.0 | Auto-restart on changes |
| npm | - | Package management |

## 📊 Database Schema

### Tables

**users**
- `id` (TEXT PRIMARY KEY)
- `email` (TEXT UNIQUE)
- `displayName` (TEXT)
- `authProvider` (TEXT) - 'google' or 'guest'
- `createdAt` (TEXT)
- `currency` (TEXT) - default 'USD'
- `theme` (TEXT) - 'light', 'dark', or 'system'
- `autoAdjustBudgets` (INTEGER) - boolean flag

**categories**
- `id` (TEXT PRIMARY KEY)
- `userId` (TEXT)
- `name` (TEXT)
- `color` (TEXT) - hex color
- `icon` (TEXT) - icon identifier
- `allocatedAmount` (REAL)
- `spentTotal` (REAL)
- `status` (TEXT) - 'healthy', 'overdrawn', 'adjusted'
- `overdrawnAmount` (REAL)
- `updatedAt` (TEXT)

**day_notes**
- `id` (TEXT PRIMARY KEY)
- `userId` (TEXT)
- `date` (TEXT) - ISO date string
- `total` (REAL) - sum of expenses
- `createdAt` (TEXT)
- `pinned` (INTEGER) - boolean flag

**expenses**
- `id` (TEXT PRIMARY KEY)
- `userId` (TEXT)
- `noteId` (TEXT) - foreign key to day_notes
- `categoryId` (TEXT) - foreign key to categories
- `type` (TEXT) - expense description
- `amount` (REAL)
- `currency` (TEXT)
- `createdAt` (TEXT)
- `tags` (TEXT) - JSON array

**income_sources**
- `id` (TEXT PRIMARY KEY)
- `userId` (TEXT)
- `name` (TEXT)
- `amount` (REAL)
- `frequency` (TEXT) - 'weekly', 'monthly', etc.
- `payday` (TEXT) - next payment date
- `createdAt` (TEXT)

**savings_goals**
- `id` (TEXT PRIMARY KEY)
- `userId` (TEXT)
- `title` (TEXT)
- `targetAmount` (REAL)
- `currentSaved` (REAL)
- `targetDate` (TEXT)
- `autoEnabled` (INTEGER) - boolean flag
- `autoAmount` (REAL)
- `autoFrequency` (TEXT)
- `createdAt` (TEXT)

**category_history**
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `categoryId` (TEXT)
- `userId` (TEXT)
- `at` (TEXT) - timestamp
- `oldAmount` (REAL)
- `newAmount` (REAL)
- `reason` (TEXT) - 'manual', 'auto-adjust', etc.

**sync_snapshots**
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `userId` (TEXT)
- `storedAt` (TEXT)
- `blob` (TEXT) - encrypted JSON

## 🔐 Security Features

### Authentication
- **Google OAuth 2.0**: Secure third-party authentication
- **Guest Mode**: Local-only access without authentication
- **Session Management**: HTTP-only cookies with secure flags
- **JWT Tokens**: Stateless authentication for API requests

### Data Protection
- **End-to-End Encryption**: AES-256-GCM for exports and sync
- **PBKDF2 Key Derivation**: 120,000 iterations with SHA-256
- **User-scoped Queries**: All database queries filter by userId
- **Input Validation**: Schema-based request validation middleware
- **SQL Injection Prevention**: Parameterized queries only

### Privacy
- **No Analytics**: No third-party tracking
- **Local-first**: Data stored locally by default
- **Optional Sync**: Cloud sync is opt-in
- **Encrypted Backups**: All cloud data is encrypted client-side

## 🎨 Design System

### Color Palette
```css
/* Light Theme */
--color-primary: #2F80ED
--color-background: #f8f9fb
--color-surface: rgba(255, 255, 255, 0.85)
--color-text: #1f2933
--color-muted: #636b74
--color-border: rgba(31, 41, 51, 0.1)
--color-danger: #eb5757
--color-success: #27ae60
--color-warning: #f2c94c

/* Dark Theme */
--color-background: #10141a
--color-surface: rgba(18, 22, 28, 0.85)
--color-text: #f4f6f8
--color-muted: #9aa4af
--color-border: rgba(244, 246, 248, 0.08)
```

### Spacing System
- 4px grid system (--space-1 through --space-6)
- Consistent 4px, 8px, 12px, 16px, 20px, 24px increments

### Typography
- Font family: Inter, Segoe UI, sans-serif
- Font sizes: 0.75rem - 1.5rem
- Font weights: 400 (regular), 500 (medium), 600 (semibold)

### Icons
- Feather-style stroke icons
- 2px stroke width
- 24x24 base size
- SVG sprite system

## 🚀 Key Features

### 1. Expense Tracking
- Quick expense entry with category assignment
- Daily note organization
- Expense tagging and filtering
- Date range filtering (today, week, month)

### 2. Budget Management
- Category-based budget allocation
- Real-time spending tracking
- Auto-adjust budget feature
- Overdrawn alerts
- Budget history with undo capability

### 3. Income Management
- Multiple income source tracking
- Frequency-based income (weekly, monthly, etc.)
- Payday tracking
- Edit and remove income sources

### 4. Savings Goals
- Target amount and date tracking
- Progress visualization
- Auto-contribution setup
- Manual fund transfers

### 5. Sync & Export
- Encrypted Google Drive sync
- JSON export with encryption
- CSV export with encryption
- Snapshot restore functionality

### 6. Offline Support
- Service worker caching
- IndexedDB storage
- Background sync (planned)
- PWA installation

### 7. Accessibility
- ARIA labels throughout
- Keyboard navigation
- Screen reader support
- High contrast mode support

## 🔄 API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/callback` - OAuth callback
- `POST /auth/guest` - Guest login
- `POST /auth/logout` - Logout

### User
- `GET /api/user` - Get current user
- `PUT /api/user/preferences` - Update preferences

### Notes & Expenses
- `GET /api/notes` - List notes with expenses
- `POST /api/notes` - Create note or expense
- `PUT /api/notes/:noteId` - Update note or expense
- `DELETE /api/notes/:noteId` - Delete note or expense

### Categories
- `GET /api/categories` - List categories with history
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category
- `POST /api/categories/:id/history/undo` - Undo last change

### Income
- `GET /api/income` - List income sources
- `POST /api/income` - Create income source
- `DELETE /api/income/:id` - Delete income source

### Savings
- `GET /api/savings` - List savings goals
- `POST /api/savings` - Create savings goal
- `PUT /api/savings/:id` - Update savings goal
- `DELETE /api/savings/:id` - Delete savings goal

### Sync
- `GET /api/sync/snapshots` - List snapshots
- `POST /api/sync/snapshots` - Create encrypted snapshot
- `POST /api/sync/restore` - Restore from snapshot

### Export
- `POST /api/export/json` - Export encrypted JSON
- `POST /api/export/csv` - Export encrypted CSV

## 📱 Progressive Web App (PWA)

### Manifest
- App name: ExpenseKeeper
- Display mode: Standalone
- Theme color: #2F80ED
- Icons: 192x192, 512x512

### Service Worker
- Cache-first for static assets
- Network-first for API calls
- Offline fallback pages

### Installation
- Add to home screen on mobile
- Desktop installation support
- Offline functionality

## 🧪 Testing Strategy

### Unit Tests
- Utility functions
- State management
- Encryption/decryption

### Integration Tests
- API endpoints
- Database operations
- Authentication flow

### E2E Tests (Planned)
- User workflows
- Offline scenarios
- Sync operations

## 🔮 Future Enhancements

### Planned Features
- [ ] Receipt photo upload and OCR
- [ ] Recurring expense automation
- [ ] Budget forecasting and insights
- [ ] Multi-currency support with conversion
- [ ] Expense splitting for shared costs
- [ ] Bank account integration
- [ ] Custom reports and charts
- [ ] Mobile app (React Native)
- [ ] Collaborative budgets
- [ ] AI-powered expense categorization

### Technical Improvements
- [ ] GraphQL API option
- [ ] WebSocket for real-time updates
- [ ] Redis caching layer
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Automated testing suite
- [ ] Performance monitoring
- [ ] Error tracking (Sentry)

## 📦 Deployment

### Development
```bash
npm install
npm run seed  # Optional: populate demo data
npm run dev   # Start with auto-reload
```

### Production
```bash
npm install --production
npm start
```

### Environment Variables
```env
PORT=3000
CLIENT_ORIGIN=http://localhost:3000
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
SESSION_SECRET=your_session_secret
SQLITE_PATH=./server/db/expensekeeper.sqlite
```

### Hosting Options
- **Backend**: Heroku, Railway, Render, DigitalOcean
- **Frontend**: Netlify, Vercel, GitHub Pages (static build)
- **Database**: SQLite file or PostgreSQL for production

## 🤝 Contributing

### Code Style
- ESLint configuration (planned)
- Prettier formatting (planned)
- 4-space indentation
- Semantic commit messages

### Feature Flags
All new features must be behind feature flags in `public/js/config/featureFlags.js`:
```javascript
export const featureFlags = {
    notesReactivity: true,
    autoAdjustBudgets: true,
    driveSync: false,
    offlinePWA: true,
    swipeGestures: false,
    indexedDBBootstrap: false
};
```

### Documentation
- Update CHANGELOG.md for all changes
- Add JSDoc comments for functions
- Update README.md for new features

## 📄 License

This project is open source and available for personal and commercial use.

## 👥 Team & Support

- **Developer**: Built with modern web standards
- **Support**: GitHub Issues
- **Documentation**: See `/docs` folder

## 🔗 Resources

- [Express.js Documentation](https://expressjs.com/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

---

**Last Updated**: October 2025  
**Version**: 0.1.0  
**Status**: Active Development
