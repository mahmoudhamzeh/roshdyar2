#!/usr/bin/env node
/**
 * @deprecated Use migrate-to-postgres.js — the app now uses PostgreSQL.
 */
console.error('SQLite is no longer the application database.');
console.error('Use: npm run migrate --prefix server');
console.error('Or:  DATABASE_URL=postgres://... node migrate-to-postgres.js');
process.exit(1);
