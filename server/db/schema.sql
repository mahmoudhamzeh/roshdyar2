PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  first_name TEXT,
  last_name TEXT,
  birth_date TEXT,
  province TEXT,
  city TEXT,
  mobile TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS children (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
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
  gestational_age REAL,
  birth_place TEXT,
  apgar1 REAL,
  apgar5 REAL,
  documents TEXT,
  vaccine_reminder TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS growth_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  recorded_on TEXT NOT NULL,
  height REAL,
  weight REAL,
  head_circumference REAL
);

CREATE INDEX IF NOT EXISTS idx_growth_child ON growth_records(child_id);

CREATE TABLE IF NOT EXISTS vaccination_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  age_months INTEGER NOT NULL,
  vaccine_name TEXT NOT NULL,
  administered_on TEXT,
  UNIQUE(child_id, age_months, vaccine_name)
);

CREATE INDEX IF NOT EXISTS idx_vaccination_child ON vaccination_records(child_id);

CREATE TABLE IF NOT EXISTS medical_visits (
  id INTEGER PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  visit_date TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_visits_child ON medical_visits(child_id);

CREATE TABLE IF NOT EXISTS medical_documents (
  id INTEGER PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  title TEXT,
  file_path TEXT NOT NULL,
  uploaded_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_child ON medical_documents(child_id);

CREATE TABLE IF NOT EXISTS checkups (
  id INTEGER PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  checkup_date TEXT NOT NULL,
  file_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_checkups_child ON checkups(child_id);

CREATE TABLE IF NOT EXISTS checkup_parameters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkup_id INTEGER NOT NULL REFERENCES checkups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value TEXT,
  unit TEXT
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  remind_on TEXT,
  type TEXT DEFAULT 'info',
  source TEXT DEFAULT 'manual',
  link TEXT
);

CREATE INDEX IF NOT EXISTS idx_reminders_child ON reminders(child_id);

CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY,
  title TEXT,
  link TEXT,
  image_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  category TEXT,
  image_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS podcasts (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS ticket_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
