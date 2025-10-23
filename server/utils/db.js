import { createDatabase, runMigrations } from '../db/connection.js';

const db = createDatabase();
runMigrations(db);

function promisify(method, sql, params = []) {
    return new Promise((resolve, reject) => {
        method.call(db, sql, params, function callback(err, result) {
            if (err) {
                reject(err);
                return;
            }
            if (result !== undefined) {
                resolve(result);
            } else {
                resolve(this);
            }
        });
    });
}

export function dbRun(sql, params = []) {
    return promisify(db.run, sql, params);
}

export function dbGet(sql, params = []) {
    return promisify(db.get, sql, params);
}

export function dbAll(sql, params = []) {
    return promisify(db.all, sql, params);
}

export default db;
