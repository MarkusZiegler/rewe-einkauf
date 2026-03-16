import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "einkauf.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
    -- Kategorien (z.B. Obst & Gemüse, Milchprodukte, Brot, etc.)
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Alle REWE-Produkte (importiert aus CSV)
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rewe_id TEXT,
      name TEXT NOT NULL,
      brand TEXT,
      price REAL,
      price_unit TEXT,
      image_url TEXT,
      category_id INTEGER REFERENCES categories(id),
      ean TEXT,
      grammage TEXT,
      is_active INTEGER DEFAULT 0,  -- 1 = im Sortiment sichtbar für Nutzer
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Einkaufslisten
    CREATE TABLE IF NOT EXISTS shopping_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      status TEXT DEFAULT 'draft',  -- draft, sent, completed
      created_at TEXT DEFAULT (datetime('now')),
      sent_at TEXT
    );

    -- Einträge in einer Einkaufsliste
    CREATE TABLE IF NOT EXISTS shopping_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER DEFAULT 1,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Index für schnelle Suche
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_list_items_list ON shopping_list_items(list_id);
  `);
}
