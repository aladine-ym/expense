import { createDatabase, runMigrations } from '../db/connection.js';
import { nanoid } from 'nanoid';

const db = createDatabase();
runMigrations(db);

const userId = 'seed-user-' + nanoid(8);
const now = new Date().toISOString();

db.serialize(() => {
    db.run(
        `INSERT INTO users (id, email, displayName, authProvider, createdAt, currency, theme, autoAdjustBudgets, resetDay)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, 'demo@expensekeeper.app', 'Demo User', 'guest', now, 'USD', 'system', 1, 1]
    );

    const categories = [
        { id: nanoid(), name: 'Food', color: '#FF8A65', icon: 'icon-categories', allocatedAmount: 300 },
        { id: nanoid(), name: 'Transport', color: '#81D4FA', icon: 'icon-wallet', allocatedAmount: 150 },
        { id: nanoid(), name: 'Entertainment', color: '#A5D6A7', icon: 'icon-goals', allocatedAmount: 100 }
    ];

    categories.forEach((cat) => {
        db.run(
            `INSERT INTO categories (id, userId, name, color, icon, allocatedAmount, spentTotal, status, overdrawnAmount, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, 0, 'healthy', 0, ?)`,
            [cat.id, userId, cat.name, cat.color, cat.icon, cat.allocatedAmount, now]
        );
    });

    const noteId = '2025-01-15';
    db.run(
        `INSERT INTO day_notes (id, userId, date, total, createdAt, pinned)
         VALUES (?, ?, ?, 0, ?, 0)`,
        [noteId, userId, noteId, now]
    );

    const expenses = [
        { id: nanoid(), type: 'Groceries', amount: 45.5, categoryId: categories[0].id },
        { id: nanoid(), type: 'Bus ticket', amount: 3.5, categoryId: categories[1].id }
    ];

    expenses.forEach((exp) => {
        db.run(
            `INSERT INTO expenses (id, userId, noteId, categoryId, type, amount, currency, createdAt, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [exp.id, userId, noteId, exp.categoryId, exp.type, exp.amount, 'USD', now, '[]']
        );
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    db.run(`UPDATE day_notes SET total = ? WHERE id = ?`, [totalExpenses, noteId]);

    db.run(
        `INSERT INTO income_sources (id, userId, name, amount, frequency, payday, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nanoid(), userId, 'Monthly Salary', 3000, 'monthly', '2025-01-31', now]
    );

    const savingsGoalId = nanoid();
    db.run(
        `INSERT INTO savings_goals (id, userId, title, targetAmount, createdAt)
         VALUES (?, ?, ?, ?, ?)`,
        [savingsGoalId, userId, 'Emergency Fund', 5000, now]
    );
    
    // Add some sample contributions
    const contributions = [
        { id: nanoid(), amount: 500, date: '2025-01-01' },
        { id: nanoid(), amount: 300, date: '2025-01-10' },
        { id: nanoid(), amount: 400, date: '2025-01-15' }
    ];
    
    contributions.forEach((contrib) => {
        db.run(
            `INSERT INTO savings_contributions (id, goalId, userId, amount, date, createdAt)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [contrib.id, savingsGoalId, userId, contrib.amount, contrib.date, now]
        );
    });

    console.log(`Seed data created for user: ${userId}`);
    console.log('Run the app and use guest mode to explore the demo data.');
});

db.close();
