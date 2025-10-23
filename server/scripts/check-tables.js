// Check database tables
import { dbAll } from '../utils/db.js';

async function checkTables() {
    try {
        // Get all tables
        const tables = await dbAll(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
            []
        );
        
        console.log('📋 Database Tables:');
        console.log('==================');
        
        for (const table of tables) {
            console.log(`\n📊 Table: ${table.name}`);
            
            // Get table schema
            const schema = await dbAll(`PRAGMA table_info(${table.name})`, []);
            console.log('Columns:');
            schema.forEach(col => {
                console.log(`  - ${col.name} (${col.type})`);
            });
            
            // Get row count
            const count = await dbAll(`SELECT COUNT(*) as count FROM ${table.name}`, []);
            console.log(`Rows: ${count[0].count}`);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkTables();
