import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

sqlite3.verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, 'expensekeeper.sqlite');

export function createDatabase() {
    const db = new sqlite3.Database(DB_PATH);
    return db;
}

export function runMigrations(db) {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT,
                displayName TEXT,
                authProvider TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                currency TEXT DEFAULT 'USD',
                theme TEXT DEFAULT 'system',
                autoAdjustBudgets INTEGER DEFAULT 1,
                resetDay INTEGER DEFAULT 1,
                lastResetDate TEXT
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                icon TEXT NOT NULL,
                allocatedAmount REAL NOT NULL,
                spentTotal REAL DEFAULT 0,
                status TEXT DEFAULT 'healthy',
                overdrawnAmount REAL DEFAULT 0,
                updatedAt TEXT,
                FOREIGN KEY (userId) REFERENCES users(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS category_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                categoryId TEXT NOT NULL,
                userId TEXT NOT NULL,
                at TEXT NOT NULL,
                oldAmount REAL NOT NULL,
                newAmount REAL NOT NULL,
                reason TEXT NOT NULL,
                FOREIGN KEY (categoryId) REFERENCES categories(id),
                FOREIGN KEY (userId) REFERENCES users(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS day_notes (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                date TEXT NOT NULL,
                total REAL DEFAULT 0,
                createdAt TEXT NOT NULL,
                pinned INTEGER DEFAULT 0,
                FOREIGN KEY (userId) REFERENCES users(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS expenses (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                noteId TEXT NOT NULL,
                categoryId TEXT NOT NULL,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                tags TEXT DEFAULT '[]',
                FOREIGN KEY (userId) REFERENCES users(id),
                FOREIGN KEY (noteId) REFERENCES day_notes(id),
                FOREIGN KEY (categoryId) REFERENCES categories(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS income_sources (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                name TEXT NOT NULL,
                amount REAL NOT NULL,
                frequency TEXT NOT NULL,
                payday TEXT,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS savings_goals (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                title TEXT NOT NULL,
                targetAmount REAL NOT NULL,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS savings_contributions (
                id TEXT PRIMARY KEY,
                goalId TEXT NOT NULL,
                userId TEXT NOT NULL,
                amount REAL NOT NULL,
                date TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (goalId) REFERENCES savings_goals(id) ON DELETE CASCADE,
                FOREIGN KEY (userId) REFERENCES users(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS sync_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId TEXT NOT NULL,
                storedAt TEXT NOT NULL,
                blob TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id)
            )
        `);
    });
}
