// Check users in database
import { dbAll } from '../utils/db.js';

async function checkUsers() {
    try {
        const users = await dbAll('SELECT * FROM users', []);
        console.log('Total users:', users.length);
        console.log('\nUsers in database:');
        users.forEach(user => {
            console.log('---');
            console.log('ID:', user.id);
            console.log('Username:', user.username);
            console.log('Display Name:', user.displayName);
            console.log('Has Password:', user.passwordHash ? 'Yes' : 'No');
        });
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkUsers();
