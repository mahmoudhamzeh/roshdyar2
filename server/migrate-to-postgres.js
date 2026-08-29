#!/usr/bin/env node
/**
 * Copy the live SQLite database into PostgreSQL.
 *
 * Preferred (reads server/.env):
 *   bash scripts/migrate-postgres.sh
 *
 * Or from /var/www/roshdyar/server after DATABASE_URL is in .env:
 *   node migrate-to-postgres.js
 *
 * FORCE_MIGRATE=1 overwrites existing Postgres rows.
 */
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });
require('dotenv').config();

function readDatabaseUrl() {
    const raw = process.env.DATABASE_URL;
    if (raw == null) return '';
    return String(raw).trim().replace(/^['"]|['"]$/g, '');
}

async function main() {
    const databaseUrl = readDatabaseUrl();
    if (!databaseUrl) {
        console.error('DATABASE_URL is not set.');
        console.error(`Looked for ${envPath} (${fs.existsSync(envPath) ? 'found' : 'missing'}).`);
        console.error('Put an English-only password in server/.env, then run:');
        console.error('  bash /var/www/roshdyar/scripts/migrate-postgres.sh');
        console.error('Do not use Persian letters in the Postgres password or URL.');
        process.exit(1);
    }
    if (/[^\x00-\x7F]/.test(databaseUrl)) {
        console.error('DATABASE_URL contains non-English characters. Use an ASCII password.');
        process.exit(1);
    }
    process.env.DATABASE_URL = databaseUrl;

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
