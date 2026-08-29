#!/usr/bin/env node
/**
 * Copy the live SQLite database into PostgreSQL.
 *
 * Usage on the server (after installing Postgres and setting DATABASE_URL):
 *   DATABASE_URL=postgres://roshdyar:SECRET@127.0.0.1:5432/roshdyar \
 *   SQLITE_PATH=/var/www/roshdyar/server/data/roshdyar.db \
 *   node server/migrate-to-postgres.js
 *
 * FORCE_MIGRATE=1 overwrites existing Postgres rows.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
require('dotenv').config();

const path = require('path');

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is required. Example:');
        console.error('  DATABASE_URL=postgres://roshdyar:pass@127.0.0.1:5432/roshdyar node migrate-to-postgres.js');
        process.exit(1);
    }
    const sqlitePath = process.env.SQLITE_PATH || path.join(__dirname, 'data', 'roshdyar.db');
    const pg = require('./db-pg');
    console.log(`PostgreSQL: ${pg.databaseUrl()}`);
    console.log(`SQLite:     ${sqlitePath}`);
    await pg.connect();
    const copied = await pg.copySqliteDatabase(sqlitePath, {
        force: process.env.FORCE_MIGRATE === '1'
    });
    const health = await pg.health();
    console.log(copied ? 'Migration finished.' : 'No copy performed (empty source or already populated).');
    console.log(health);
    await pg.close();
}

main().catch(async (err) => {
    console.error(err);
    try {
        const pg = require('./db-pg');
        await pg.close();
    } catch (_) { /* ignore */ }
    process.exit(1);
});
