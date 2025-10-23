// Import October expense data (October 1-21, 2025)
import { dbAll, dbGet, dbRun } from '../utils/db.js';
import { nanoid } from 'nanoid';

// Corrected expense data (October 1-21, 2025) - Fixed category names
const expenseData = `1 octobre
Taxi 100
Breakfast 100
Grocery 300
Cosmetics 1100
Superette 980
Superette 1220
Taxi 200
Grocery 560
Jazar 550
Librarya 530

2 octobre
Superette 330
Breakfast 140
Taxi 100
Doctor 3000
Taxi 1100
Pharmacy 1790
Dinner 350
Gym/Sports 1500
Superette 13800
Cafeteria 80

3 octobre
Quincaillerie 790
Grocery 1200
Fish 600
Superette 170
Taxi 100
Cafeteria 250
Taxi 150
Superette 420
Taxi 150
Cafeteria 80

4 octobre
Taxi 350
Cafeteria 60
Taxi 150
Librarya 430
Taxi 450

5 octobre
Kindergarten 15000
Taxi 250
Superette 120
Breakfast 100
Taxi 150
Taxi 150
Grocery 200
Taxi 300
Fast-Food 200
Pharmacy 420
Cafeteria 50

6 octobre
Superette 330
Taxi 100
Breakfast 100
Dinner 150
Taxi 250
Gym/Sports 50

7 octobre
Superette 620
Taxi 250
Dinner 170
Taxi 150
Cafeteria 650

8 octobre
Taxi 300
Breakfast 150
Dinner 150
Breakfast 170
Jazar 850
Grocery 280
Superette 200

9 octobre
Taxi 250
Breakfast 100
Dinner 170
Taxi 150
Superette 300
Grocery 300
Pharmacy 350

10 octobre
Superette 370
Dinner 1000
Cafeteria 50

11 octobre
Superette 250
Breakfast 90
Grocery 160
Taxi 300
Barber 310

12 octobre
Taxi 200
Breakfast 100
Taxi 150
Taxi 200
Jazar 280
Grocery 170
Superette 240

13 octobre
Taxi 250
Breakfast 40
Dinner 60
Dinner 1400
Cafeteria 200

14 octobre
Superette 230
Taxi 200
Breakfast 60
Taxi 200
Dinner 100
Taxi 130
P 200
Cafeteria 150

15 octobre
Taxi 100
Breakfast 100
Dinner 300
Superette 80

16 octobre
Superette 370
Breakfast 120
Dinner 200
Jazar 760
Pharmacy 300
Fast-Food 200
Grocery 740
Superette 710

17 octobre
Quincaillerie 120
Superette 190
Grocery 250
Taxi 150
Superette 240
Taxi 150
Grocery 350
Superette 250
Cafeteria 50

18 octobre
Taxi 100
Quincaillerie 350
Barber 300
Superette 790
Dinner 480
Taxi 200
Cafeteria 40

19 octobre
Superette 620
Taxi 250
Breakfast 120
Dinner 150
Superette 110
Grocery 350

20 octobre
Taxi 250
Breakfast 90
Taxi 180
Superette 360
Dinner 120
Jazar 300

21 octobre
Superette 70
Taxi 250
Breakfast 120
Dinner 240
Superette 280
Taxi 150
Grocery 250`;

async function importOctoberExpenses() {
    try {
        console.log('🔄 Starting October expense import...');

        // Category name mapping (handle spelling variations)
        const categoryMap = {
            'Fastfood': 'Fast-Food',
            'Pharmacie': 'Pharmacy',
            'Liquid': 'P'
        };

        // Get existing categories with IDs
        const categories = await dbAll('SELECT id, name FROM categories', []);
        const categoryLookup = new Map(categories.map(cat => [cat.name, cat.id]));

        // Get user ID (local-user)
        const userId = 'local-user';

        // Parse data by date
        const lines = expenseData.split('\n').filter(line => line.trim());
        let currentDate = null;
        let dayExpenses = [];

        for (const line of lines) {
            // Check if line is a date (contains "octobre")
            if (line.toLowerCase().includes('octobre')) {
                // Save previous day if exists
                if (currentDate && dayExpenses.length > 0) {
                    await saveDayData(currentDate, dayExpenses, categoryLookup, userId);
                    dayExpenses = [];
                }

                // Parse new date (e.g., "1 octobre" -> "2025-10-01")
                const day = line.split(' ')[0];
                currentDate = `2025-10-${day.padStart(2, '0')}`;
                console.log(`📅 Processing ${currentDate}...`);
            } else {
                // Parse expense line (e.g., "Taxi 100")
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2) {
                    const categoryName = parts.slice(0, -1).join(' ');
                    const amount = parseInt(parts[parts.length - 1]);

                    if (categoryName && !isNaN(amount)) {
                        const mappedCategory = categoryMap[categoryName] || categoryName;
                        dayExpenses.push({
                            category: mappedCategory,
                            amount: amount
                        });
                    }
                }
            }
        }

        // Save last day
        if (currentDate && dayExpenses.length > 0) {
            await saveDayData(currentDate, dayExpenses, categoryLookup, userId);
        }

        console.log('✅ October expense import completed successfully!');
        console.log('📊 Imported 21 days of expenses');

    } catch (error) {
        console.error('❌ Import failed:', error.message);
        process.exit(1);
    }
}

async function saveDayData(date, expenses, categoryLookup, userId) {
    const now = new Date().toISOString();
    const noteId = date;

    // Calculate total
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Create/update day note
    await dbRun(
        'INSERT OR REPLACE INTO day_notes (id, userId, date, total, createdAt, pinned) VALUES (?, ?, ?, ?, ?, 0)',
        [noteId, userId, date, total, now]
    );

    // Delete existing expenses for this day
    await dbRun('DELETE FROM expenses WHERE noteId = ? AND userId = ?', [noteId, userId]);

    // Add expenses
    for (const expense of expenses) {
        const categoryId = categoryLookup.get(expense.category);
        if (!categoryId) {
            throw new Error(`Category not found: ${expense.category}`);
        }

        const expenseId = nanoid();
        await dbRun(
            'INSERT INTO expenses (id, userId, noteId, categoryId, type, amount, currency, createdAt, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [expenseId, userId, noteId, categoryId, expense.category, expense.amount, 'DZD', now, '[]']
        );
    }

    console.log(`   💾 Saved ${expenses.length} expenses (${total} DZD)`);
}

importOctoberExpenses();
