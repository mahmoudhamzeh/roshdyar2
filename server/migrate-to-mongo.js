#!/usr/bin/env node
/**
 * Migrate server/db.json into MongoDB.
 *
 * Usage:
 *   node migrate-to-mongo.js
 *   FORCE_MIGRATE=1 node migrate-to-mongo.js
 */
require('dotenv').config();
const path = require('path');
const { migrateFromJson, close, MONGODB_URI, DB_NAME } = require('./db');

async function main() {
    const jsonPath = path.join(__dirname, 'db.json');
    console.log(`MongoDB URI: ${MONGODB_URI}`);
    console.log(`Database: ${DB_NAME}`);
    await migrateFromJson(jsonPath);
    await close();
}

main().catch(async (err) => {
    console.error(err);
    await close();
    process.exit(1);
});
