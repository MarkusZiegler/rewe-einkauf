/**
 * Seed-Script: Erstellt Standard-Kategorien und Beispiel-Produkte.
 * Ausführen mit: npx tsx scripts/seed.ts
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, "einkauf.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
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
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS shopping_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now')),
    sent_at TEXT
  );
  CREATE TABLE IF NOT EXISTS shopping_list_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER DEFAULT 1,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
  CREATE INDEX IF NOT EXISTS idx_list_items_list ON shopping_list_items(list_id);
`);

// Seed categories
const categories = [
  { name: "Obst & Gemüse", icon: "🥬", sort_order: 1 },
  { name: "Brot & Backwaren", icon: "🍞", sort_order: 2 },
  { name: "Milchprodukte", icon: "🧀", sort_order: 3 },
  { name: "Fleisch & Wurst", icon: "🥩", sort_order: 4 },
  { name: "Getränke", icon: "🥤", sort_order: 5 },
  { name: "Tiefkühl", icon: "🧊", sort_order: 6 },
  { name: "Konserven & Fertiggerichte", icon: "🥫", sort_order: 7 },
  { name: "Süßigkeiten & Snacks", icon: "🍫", sort_order: 8 },
  { name: "Haushalt & Hygiene", icon: "🧹", sort_order: 9 },
  { name: "Sonstiges", icon: "📦", sort_order: 10 },
];

const insertCat = db.prepare(
  "INSERT OR IGNORE INTO categories (name, icon, sort_order) VALUES (?, ?, ?)"
);
for (const cat of categories) {
  insertCat.run(cat.name, cat.icon, cat.sort_order);
}

// Seed some example products (all active by default for demo)
const getCatId = db.prepare("SELECT id FROM categories WHERE name = ?");

const sampleProducts = [
  // Obst & Gemüse
  { name: "Bananen", category: "Obst & Gemüse", price: 1.49, grammage: "1 kg", is_active: 1 },
  { name: "Äpfel", category: "Obst & Gemüse", price: 2.49, grammage: "1 kg", brand: "REWE Beste Wahl", is_active: 1 },
  { name: "Tomaten", category: "Obst & Gemüse", price: 1.99, grammage: "500 g", is_active: 1 },
  { name: "Kartoffeln", category: "Obst & Gemüse", price: 2.99, grammage: "2 kg", is_active: 1 },
  { name: "Gurke", category: "Obst & Gemüse", price: 0.79, grammage: "1 Stück", is_active: 1 },
  { name: "Zwiebeln", category: "Obst & Gemüse", price: 1.29, grammage: "1 kg", is_active: 1 },
  { name: "Karotten", category: "Obst & Gemüse", price: 0.99, grammage: "1 kg", is_active: 1 },
  { name: "Paprika Mix", category: "Obst & Gemüse", price: 2.99, grammage: "500 g", is_active: 1 },
  // Brot & Backwaren
  { name: "Vollkornbrot", category: "Brot & Backwaren", price: 1.89, grammage: "500 g", is_active: 1 },
  { name: "Toastbrot", category: "Brot & Backwaren", price: 1.29, grammage: "500 g", brand: "Golden Toast", is_active: 1 },
  { name: "Brötchen", category: "Brot & Backwaren", price: 0.29, grammage: "1 Stück", is_active: 1 },
  // Milchprodukte
  { name: "Vollmilch 3,5%", category: "Milchprodukte", price: 1.15, grammage: "1 L", is_active: 1 },
  { name: "Butter", category: "Milchprodukte", price: 2.19, grammage: "250 g", brand: "Kerrygold", is_active: 1 },
  { name: "Joghurt Natur", category: "Milchprodukte", price: 0.65, grammage: "500 g", is_active: 1 },
  { name: "Gouda", category: "Milchprodukte", price: 1.99, grammage: "200 g", is_active: 1 },
  { name: "Eier (10 Stück)", category: "Milchprodukte", price: 2.49, grammage: "10 Stück", brand: "Freiland", is_active: 1 },
  // Fleisch & Wurst
  { name: "Hähnchenbrust", category: "Fleisch & Wurst", price: 5.99, grammage: "400 g", is_active: 1 },
  { name: "Schinken", category: "Fleisch & Wurst", price: 2.49, grammage: "200 g", is_active: 1 },
  { name: "Hackfleisch gemischt", category: "Fleisch & Wurst", price: 3.99, grammage: "400 g", is_active: 1 },
  // Getränke
  { name: "Mineralwasser", category: "Getränke", price: 0.49, grammage: "1.5 L", is_active: 1 },
  { name: "Apfelsaft", category: "Getränke", price: 1.49, grammage: "1 L", is_active: 1 },
  { name: "Kaffee gemahlen", category: "Getränke", price: 4.99, grammage: "500 g", brand: "Melitta", is_active: 1 },
  // Tiefkühl
  { name: "TK-Pizza Margherita", category: "Tiefkühl", price: 2.49, grammage: "350 g", brand: "Dr. Oetker", is_active: 1 },
  { name: "TK-Erbsen", category: "Tiefkühl", price: 1.29, grammage: "450 g", is_active: 1 },
  { name: "TK-Fischstäbchen", category: "Tiefkühl", price: 2.99, grammage: "450 g", brand: "iglo", is_active: 1 },
  // Konserven
  { name: "Passierte Tomaten", category: "Konserven & Fertiggerichte", price: 0.99, grammage: "500 g", is_active: 1 },
  { name: "Nudeln Spaghetti", category: "Konserven & Fertiggerichte", price: 0.99, grammage: "500 g", brand: "Barilla", is_active: 1 },
  { name: "Reis", category: "Konserven & Fertiggerichte", price: 1.79, grammage: "1 kg", is_active: 1 },
  // Haushalt
  { name: "Toilettenpapier", category: "Haushalt & Hygiene", price: 3.99, grammage: "8 Rollen", is_active: 1 },
  { name: "Spülmittel", category: "Haushalt & Hygiene", price: 1.29, grammage: "500 ml", brand: "Pril", is_active: 1 },
  { name: "Küchentücher", category: "Haushalt & Hygiene", price: 2.49, grammage: "4 Rollen", is_active: 1 },
];

const insertProduct = db.prepare(`
  INSERT INTO products (name, brand, price, grammage, category_id, is_active)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const existingCount = (db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number }).count;

if (existingCount === 0) {
  for (const p of sampleProducts) {
    const cat = getCatId.get(p.category) as { id: number } | undefined;
    insertProduct.run(p.name, p.brand || null, p.price, p.grammage, cat?.id || null, p.is_active);
  }
  console.log(`✅ ${sampleProducts.length} Beispiel-Produkte eingefügt.`);
} else {
  console.log(`ℹ️  Datenbank enthält bereits ${existingCount} Produkte. Überspringe Seed.`);
}

console.log(`✅ ${categories.length} Kategorien erstellt/aktualisiert.`);
console.log("✅ Datenbank bereit!");
db.close();
