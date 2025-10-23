// ======================= Create Admin User Script =======================

import { dbGet, dbRun } from '../utils/db.js';
import crypto from 'crypto';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '13072901';
const ADMIN_ID = 'local-user'; // Use existing local-user ID

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function createAdminUser() {
    try {
        // Check if users table has username and passwordHash columns
        const tableInfo = await dbGet(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"
        );
        
        if (tableInfo) {
            const hasUsername = tableInfo.sql.includes('username');
            const hasPasswordHash = tableInfo.sql.includes('passwordHash');
            
            if (!hasUsername || !hasPasswordHash) {
                console.log('Adding username and passwordHash columns to users table...');
                
                if (!hasUsername) {
                    await dbRun('ALTER TABLE users ADD COLUMN username TEXT');
                }
                if (!hasPasswordHash) {
                    await dbRun('ALTER TABLE users ADD COLUMN passwordHash TEXT');
                }
                
                console.log('Columns added successfully');
            }
        }

        // Check if local-user exists
        const localUser = await dbGet('SELECT * FROM users WHERE id = ?', [ADMIN_ID]);
        
        if (localUser) {
            // Update local-user to become admin
            console.log('Setting up admin credentials for local-user...');
            await dbRun(
                'UPDATE users SET username = ?, passwordHash = ?, displayName = ? WHERE id = ?',
                [ADMIN_USERNAME, hashPassword(ADMIN_PASSWORD), 'Administrator', ADMIN_ID]
            );
            console.log('✅ Admin user configured successfully');
        } else {
            // Create new admin user
            console.log('Creating new admin user...');
            const now = new Date().toISOString();
            await dbRun(
                `INSERT INTO users (id, username, passwordHash, email, displayName, authProvider, createdAt, currency, theme, autoAdjustBudgets, resetDay)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    ADMIN_ID,
                    ADMIN_USERNAME,
                    hashPassword(ADMIN_PASSWORD),
                    null,
                    'Administrator',
                    'local',
                    now,
                    'DZD',
                    'dark',
                    1,
                    1
                ]
            );
            console.log('✅ Admin user created successfully');
        }

        console.log('\n📋 Admin Credentials:');
        console.log('   Username: admin');
        console.log('   Password: 13072901');
        console.log('\n🔒 Password is securely hashed in database');
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        process.exit(1);
    }
}

createAdminUser();
