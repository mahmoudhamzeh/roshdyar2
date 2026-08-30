#!/usr/bin/env node
/**
 * Migrate server/db.json into relational SQLite tables.
 *
 * Usage:
 *   node migrate-to-sqlite.js
 *   FORCE_MIGRATE=1 node migrate-to-sqlite.js
 */
require('dotenv').config();
const path = require('path');
const { migrateFromJson, close, DB_FILE } = require('./db');

async function main() {
    const jsonPath = path.join(__dirname, 'db.json');
    console.log(`SQLite file: ${DB_FILE}`);
    migrateFromJson(jsonPath);
    close();
}

main().catch((err) => {
    console.error(err);
    close();
    process.exit(1);
});
