import { createDatabase } from '../db/connection.js';
import { nanoid } from 'nanoid';

const db = createDatabase();
const now = new Date().toISOString();

db.serialize(() => {
    // Get all users
    db.all('SELECT id, displayName FROM users', [], (err, users) => {
        if (err || !users || users.length === 0) {
            console.error('No users found:', err);
            db.close();
            return;
        }
        
        console.log('Found', users.length, 'users');
        
        users.forEach(user => {
            console.log('Processing user:', user.id, user.displayName);
        
            // Check if savings goal already exists
            db.get('SELECT id FROM savings_goals WHERE userId = ?', [user.id], (err, existing) => {
                if (existing) {
                    console.log('  - Savings goal already exists for', user.displayName);
                    return;
                }
            
                const savingsGoalId = nanoid();
                
                // Create savings goal
                db.run(
                    `INSERT INTO savings_goals (id, userId, title, targetAmount, createdAt)
                     VALUES (?, ?, ?, ?, ?)`,
                    [savingsGoalId, user.id, 'Emergency Fund', 5000, now],
                    (err) => {
                        if (err) {
                            console.error('Failed to create savings goal:', err);
                            return;
                        }
                        
                        console.log('  - Savings goal created for', user.displayName);
                    
                        // Add contributions
                        const contributions = [
                            { id: nanoid(), amount: 500, date: '2025-01-01T00:00:00Z' },
                            { id: nanoid(), amount: 300, date: '2025-01-10T00:00:00Z' },
                            { id: nanoid(), amount: 400, date: '2025-01-15T00:00:00Z' }
                        ];
                        
                        contributions.forEach((contrib) => {
                            db.run(
                                `INSERT INTO savings_contributions (id, goalId, userId, amount, date, createdAt)
                                 VALUES (?, ?, ?, ?, ?, ?)`,
                                [contrib.id, savingsGoalId, user.id, contrib.amount, contrib.date, now],
                                (err) => {
                                    if (err) {
                                        console.error('Failed to create contribution:', err);
                                    }
                                }
                            );
                        });
                        
                        console.log('  - Added 3 contributions');
                    }
                );
            });
        });
        
        // Close after a delay to allow all async operations to complete
        setTimeout(() => {
            console.log('\nDone!');
            db.close();
        }, 1000);
    });
});
