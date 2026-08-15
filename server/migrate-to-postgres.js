#!/usr/bin/env node
/**
 * Seed PostgreSQL from server/db.json.
 *
 * Usage:
 *   node migrate-to-postgres.js
 *   FORCE_MIGRATE=1 node migrate-to-postgres.js
 */
require('dotenv').config();
const path = require('path');
const { migrateFromJson, close, databaseUrl } = require('./db');

async function main() {
    console.log(`PostgreSQL: ${databaseUrl()}`);
    await migrateFromJson(path.join(__dirname, 'db.json'));
    await close();
}

main().catch(async (err) => {
    console.error(err);
    await close();
    process.exit(1);
});
