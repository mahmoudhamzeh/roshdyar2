-- Relational schema for TatKids / Roshdyar.
-- Version 2 replaces the single app_state JSON blob with indexed tables.

CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    email TEXT,
    mobile TEXT,
    password TEXT,
    first_name TEXT,
    last_name TEXT,
    birth_date TEXT,
    province TEXT,
    city TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0,
    profile_complete INTEGER NOT NULL DEFAULT 0,
    created_at TEXT,
    extra TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(lower(username));
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email));
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

CREATE TABLE IF NOT EXISTS children (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    first_name TEXT,
    last_name TEXT,
    name TEXT,
    gender TEXT,
    birth_date TEXT,
    avatar TEXT,
    height TEXT,
    weight TEXT,
    blood_type TEXT,
    allergies TEXT,
    special_illnesses TEXT,
    national_id TEXT,
    father_name TEXT,
    birth_weight REAL,
    birth_height REAL,
    birth_head_circumference REAL,
    birth_type TEXT,
    gestational_age INTEGER,
    birth_place TEXT,
    apgar1 INTEGER,
    apgar5 INTEGER,
    vaccine_reminder TEXT,
    extra TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);

CREATE TABLE IF NOT EXISTS vaccination_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    age_group INTEGER NOT NULL,
    vaccine_name TEXT NOT NULL,
    value TEXT NOT NULL,
    UNIQUE (child_id, age_group, vaccine_name),
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vaccination_child ON vaccination_records(child_id);

CREATE TABLE IF NOT EXISTS growth_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT UNIQUE,
    child_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    height REAL,
    weight REAL,
    head_circumference REAL,
    UNIQUE (child_id, date),
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_growth_child_date ON growth_records(child_id, date);

CREATE TABLE IF NOT EXISTS medical_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    date TEXT,
    doctor_name TEXT,
    reason TEXT,
    summary TEXT,
    description TEXT,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_visits_child ON medical_visits(child_id, date);

CREATE TABLE IF NOT EXISTS medical_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    title TEXT,
    date TEXT,
    url TEXT,
    uploaded_at TEXT,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_documents_child ON medical_documents(child_id);

CREATE TABLE IF NOT EXISTS checkups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    title TEXT,
    date TEXT,
    parameters TEXT,
    file_url TEXT,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_checkups_child ON checkups(child_id, date);

CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    child_id INTEGER NOT NULL,
    title TEXT,
    message TEXT,
    description TEXT,
    date TEXT,
    alarm_at TEXT,
    type TEXT,
    source TEXT,
    category TEXT,
    link TEXT,
    extra TEXT,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reminders_child ON reminders(child_id);

CREATE TABLE IF NOT EXISTS user_reminders (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT,
    description TEXT,
    alarm_at TEXT,
    created_at TEXT,
    notified INTEGER NOT NULL DEFAULT 0,
    type TEXT,
    source TEXT,
    extra TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_reminders_user ON user_reminders(user_id, alarm_at);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    image_url TEXT,
    type TEXT,
    is_bulk INTEGER NOT NULL DEFAULT 0,
    created_at TEXT,
    created_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

CREATE TABLE IF NOT EXISTS message_recipients (
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_recipients_user ON message_recipients(user_id, is_read);

CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    link TEXT,
    image_url TEXT
);

CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    summary TEXT,
    content TEXT,
    category TEXT,
    image_url TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_news_created ON news(created_at);

CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    summary TEXT,
    url TEXT,
    thumbnail_url TEXT,
    created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at);

CREATE TABLE IF NOT EXISTS podcasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    summary TEXT,
    url TEXT,
    thumbnail_url TEXT,
    duration TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT,
    updated_at TEXT,
    payload TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price REAL NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT,
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_active_category ON products(active, category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total REAL NOT NULL DEFAULT 0,
    shipping_address TEXT,
    phone TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    name TEXT,
    price REAL,
    quantity INTEGER,
    line_total REAL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS otp_codes (
    phone TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    purpose TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    sent_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);
