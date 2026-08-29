/**
 * Database selector.
 * Default: SQLite (current production).
 * Set DATABASE_URL=postgres://... to use PostgreSQL.
 */
if (process.env.DATABASE_URL) {
    module.exports = require('./db-pg');
} else {
    module.exports = require('./db-sqlite');
}
