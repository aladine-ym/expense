import { createDatabase } from '../db/connection.js';
import { nanoid } from 'nanoid';

const db = createDatabase();
const now = new Date().toISOString();
const LOCAL_USER_ID = 'local-user';

db.serialize(() => {
    // Check if local user exists, create if not
    db.get('SELECT id FROM users WHERE id = ?', [LOCAL_USER_ID], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            db.close();
            return;
        }
        
        if (!user) {
            console.log('Creating local user...');
            db.run(
                `INSERT INTO users (id, email, displayName, authProvider, createdAt, currency, theme, autoAdjustBudgets, resetDay)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [LOCAL_USER_ID, null, 'Local User', 'local', now, 'DZD', 'system', 1, 1],
                (err) => {
                    if (err) {
                        console.error('Failed to create user:', err);
                        db.close();
                        return;
                    }
                    console.log('✓ Local user created');
                    createSavingsData();
                }
            );
        } else {
            console.log('Found local user:', LOCAL_USER_ID);
            createSavingsData();
        }
    });
    
    function createSavingsData() {
        
        // Delete existing savings for local user
        db.run('DELETE FROM savings_contributions WHERE userId = ?', [LOCAL_USER_ID]);
        db.run('DELETE FROM savings_goals WHERE userId = ?', [LOCAL_USER_ID], (err) => {
            if (err) console.error('Error deleting goals:', err);
            
            // Create new savings goal
            const savingsGoalId = nanoid();
            
            db.run(
                `INSERT INTO savings_goals (id, userId, title, targetAmount, createdAt)
                 VALUES (?, ?, ?, ?, ?)`,
                [savingsGoalId, LOCAL_USER_ID, 'Emergency Fund', 5000, now],
                (err) => {
                    if (err) {
                        console.error('Failed to create savings goal:', err);
                        db.close();
                        return;
                    }
                    
                    console.log('✓ Savings goal created');
                    
                    // Add contributions
                    const contributions = [
                        { id: nanoid(), amount: 500, date: '2025-01-01T00:00:00Z' },
                        { id: nanoid(), amount: 300, date: '2025-01-10T00:00:00Z' },
                        { id: nanoid(), amount: 400, date: '2025-01-15T00:00:00Z' }
                    ];
                    
                    let completed = 0;
                    contributions.forEach((contrib) => {
                        db.run(
                            `INSERT INTO savings_contributions (id, goalId, userId, amount, date, createdAt)
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [contrib.id, savingsGoalId, LOCAL_USER_ID, contrib.amount, contrib.date, now],
                            (err) => {
                                if (err) {
                                    console.error('Failed to create contribution:', err);
                                }
                                
                                completed++;
                                if (completed === contributions.length) {
                                    console.log('✓ Added 3 contributions (500 + 300 + 400 = 1200 DZD)');
                                    console.log('\n✅ Savings data added successfully!');
                                    console.log('Refresh the savings page to see the data.');
                                    db.close();
                                }
                            }
                        );
                    });
                }
            );
        });
    };
});
