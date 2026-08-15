-- Baraha Mess 2.0 Database Schema
-- Cloudflare D1 (SQLite-compatible)

-- ============================================
-- Admin Users
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- Members
-- ============================================
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  member_id TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- Mess Months (Monthly Cycles)
-- ============================================
CREATE TABLE IF NOT EXISTS mess_months (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month_year TEXT NOT NULL UNIQUE,
  contribution_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT
);

-- ============================================
-- Month Members (Members in a specific month)
-- ============================================
CREATE TABLE IF NOT EXISTS month_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  contribution_amount REAL NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('paid', 'unpaid', 'partial')),
  amount_paid REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (month_id) REFERENCES mess_months(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  UNIQUE(month_id, member_id)
);

-- ============================================
-- Payments
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month_member_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL DEFAULT (date('now')),
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (month_member_id) REFERENCES month_members(id) ON DELETE CASCADE
);

-- ============================================
-- Expense Categories
-- ============================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'tag'
);

-- ============================================
-- Expenses
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month_id INTEGER NOT NULL,
  created_by INTEGER NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  description TEXT DEFAULT '',
  category_id INTEGER,
  added_by_type TEXT NOT NULL DEFAULT 'member' CHECK(added_by_type IN ('admin', 'member')),
  added_by_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (month_id) REFERENCES mess_months(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL
);

-- ============================================
-- Activity Logs
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_type TEXT NOT NULL CHECK(actor_type IN ('admin', 'member')),
  actor_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  action_type TEXT NOT NULL,
  details TEXT DEFAULT '',
  reference_id INTEGER,
  reference_type TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- Sessions
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  user_type TEXT NOT NULL CHECK(user_type IN ('admin', 'member')),
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_month_members_month ON month_members(month_id);
CREATE INDEX IF NOT EXISTS idx_month_members_member ON month_members(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_month_member ON payments(month_member_id);
CREATE INDEX IF NOT EXISTS idx_expenses_month ON expenses(month_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON activity_logs(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- Seed Data: Default Admin
-- Initial placeholder. Seeded/hashed automatically on first login.
-- Default initial password: admin123 (or env.ADMIN_PASSWORD if set)
-- ============================================
INSERT OR IGNORE INTO admins (username, password_hash) 
VALUES ('admin', 'env');

-- ============================================
-- Seed Data: Default Expense Categories
-- ============================================
INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Groceries', 'shopping-cart');
INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Vegetables', 'carrot');
INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Meat', 'beef');
INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Rice', 'wheat');
INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Gas', 'flame');
INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Utilities', 'zap');
INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Fruits', 'apple');
INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Dairy', 'milk');
INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Spices', 'pepper');
INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Cleaning', 'sparkles');
INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Water', 'droplets');
INSERT OR IGNORE INTO expense_categories (name, icon) VALUES ('Other', 'tag');
