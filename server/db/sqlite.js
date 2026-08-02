/**
 * Thin better-sqlite3-compatible wrapper around sql.js (pure WASM).
 * No native build tools required on Windows.
 */
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

class Statement {
    constructor(db, sql, persist) {
        this._db = db;
        this._sql = sql;
        this._persist = persist;
        this._isSelect = /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql);
    }

    _normalizeParams(params) {
        if (params.length === 0) return [];
        if (params.length === 1 && params[0] != null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
            const obj = params[0];
            // Convert {user_id: 1} named params to :user_id style for sql.js
            const named = {};
            for (const [key, value] of Object.entries(obj)) {
                named[key.startsWith(':') || key.startsWith('@') || key.startsWith('$') ? key : `@${key}`] = value;
            }
            return named;
        }
        return params;
    }

    get(...params) {
        const stmt = this._db.prepare(this._sql);
        try {
            const bound = this._normalizeParams(params);
            if (Array.isArray(bound)) {
                if (bound.length) stmt.bind(bound);
            } else {
                stmt.bind(bound);
            }
            if (stmt.step()) return stmt.getAsObject();
            return undefined;
        } finally {
            stmt.free();
        }
    }

    all(...params) {
        const stmt = this._db.prepare(this._sql);
        const rows = [];
        try {
            const bound = this._normalizeParams(params);
            if (Array.isArray(bound)) {
                if (bound.length) stmt.bind(bound);
            } else {
                stmt.bind(bound);
            }
            while (stmt.step()) rows.push(stmt.getAsObject());
            return rows;
        } finally {
            stmt.free();
        }
    }

    run(...params) {
        const bound = this._normalizeParams(params);
        if (Array.isArray(bound)) {
            this._db.run(this._sql, bound);
        } else {
            this._db.run(this._sql, bound);
        }
        const changesRes = this._db.exec('SELECT changes() AS changes');
        const idRes = this._db.exec('SELECT last_insert_rowid() AS id');
        const changes = changesRes[0]?.values?.[0]?.[0] ?? 0;
        const lastInsertRowid = idRes[0]?.values?.[0]?.[0] ?? 0;
        this._persist();
        return { changes, lastInsertRowid };
    }
}

class SqliteDatabase {
    constructor(filePath) {
        this.filePath = filePath;
        this._db = null;
        this._ready = false;
        this._persistTimer = null;
    }

    async open() {
        if (this._ready) return this;
        const sqlJsDist = path.dirname(require.resolve('sql.js'));
        const SQL = await initSqlJs({
            locateFile: (file) => path.join(sqlJsDist, file),
        });

        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Remove WAL leftovers from previous better-sqlite3 runs
        for (const suffix of ['-wal', '-shm']) {
            const p = this.filePath + suffix;
            if (fs.existsSync(p)) fs.unlinkSync(p);
        }

        if (fs.existsSync(this.filePath)) {
            const fileBuffer = fs.readFileSync(this.filePath);
            this._db = new SQL.Database(fileBuffer);
        } else {
            this._db = new SQL.Database();
        }
        this._ready = true;
        return this;
    }

    persist() {
        if (!this._db) return;
        const data = this._db.export();
        fs.writeFileSync(this.filePath, Buffer.from(data));
    }

    _schedulePersist() {
        if (this._inTransaction) return;
        if (this._persistTimer) clearTimeout(this._persistTimer);
        this._persistTimer = setTimeout(() => {
            this._persistTimer = null;
            this.persist();
        }, 50);
    }

    exec(sql) {
        this._db.exec(sql);
        this._schedulePersist();
    }

    prepare(sql) {
        return new Statement(this._db, sql, () => this._schedulePersist());
    }

    pragma() {
        // no-op compatibility with better-sqlite3
        return null;
    }

    transaction(fn) {
        return (...args) => {
            this._inTransaction = true;
            this._db.run('BEGIN');
            try {
                const result = fn(...args);
                this._db.run('COMMIT');
                this._inTransaction = false;
                this.persist();
                return result;
            } catch (err) {
                try { this._db.run('ROLLBACK'); } catch (_) { /* ignore */ }
                this._inTransaction = false;
                throw err;
            }
        };
    }
}

module.exports = { SqliteDatabase };
