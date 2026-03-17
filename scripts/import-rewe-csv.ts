/**
 * Importiert REWE-Produktdaten aus einer CSV-Datei (Format: L480/rewe-price-data).
 *
 * Nutzung:
 *   npx tsx scripts/import-rewe-csv.ts <pfad-zur-csv>
 *   npx tsx scripts/import-rewe-csv.ts --download     # Lädt die neueste CSV automatisch herunter
 *
 * CSV-Spalten: name, brand, ean, price, grammage, category, sale, image
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import https from "https";

const DB_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, "einkauf.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Category icon mapping
const CATEGORY_ICONS: Record<string, string> = {
  "Obst & Gemüse": "🥬",
  "Frische & Kühlung": "❄️",
  "Milch, Käse & Ei": "🧀",
  "Brot & Gebäck": "🍞",
  "Fleisch & Fisch": "🥩",
  "Süßes & Salziges": "🍫",
  "Getränke": "🥤",
  "Tiefkühl": "🧊",
  "Kochen & Backen": "🍳",
  "Frühstück": "☕",
  "Baby & Kind": "👶",
  "Haushalt": "🧹",
  "Pflege & Gesundheit": "💊",
  "Wein & Spirituosen": "🍷",
  "Tier": "🐾",
  "International": "🌍",
};

function getIconForCategory(name: string): string {
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (name.includes(key) || key.includes(name)) return icon;
  }
  return "📦";
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function downloadCSV(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (reqUrl: string) => {
      https.get(reqUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const location = res.headers.location;
          if (location) {
            request(location);
            return;
          }
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download fehlgeschlagen: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
      }).on("error", reject);
    };
    request(url);
  });
}

export function importCSV(csvContent: string): { imported: number; categories: number; skipped: number } {
  const lines = csvContent.split("\n").filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV-Datei ist leer oder hat keine Daten.");

  // Parse header
  const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const brandIdx = header.indexOf("brand");
  const eanIdx = header.indexOf("ean");
  const priceIdx = header.indexOf("price");
  const grammageIdx = header.indexOf("grammage");
  const categoryIdx = header.indexOf("category");
  const imageIdx = header.indexOf("image");

  if (nameIdx === -1 || priceIdx === -1) {
    throw new Error("CSV muss mindestens die Spalten 'name' und 'price' enthalten.");
  }

  // Prepare statements
  const findCategory = db.prepare("SELECT id FROM categories WHERE name = ?");
  const insertCategory = db.prepare(
    "INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)"
  );
  const findProductByEan = db.prepare("SELECT id FROM products WHERE ean = ?");
  const findProductByName = db.prepare("SELECT id FROM products WHERE name = ? AND brand = ?");
  const insertProduct = db.prepare(`
    INSERT INTO products (name, brand, price, grammage, image_url, category_id, ean, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `);
  const updateProduct = db.prepare(`
    UPDATE products SET price = ?, grammage = ?, image_url = ?, category_id = ?
    WHERE id = ?
  `);

  const categoryCache = new Map<string, number>();
  let imported = 0;
  let skipped = 0;
  let newCategories = 0;
  let maxSortOrder = (db.prepare("SELECT MAX(sort_order) as m FROM categories").get() as { m: number | null })?.m || 0;

  // Load existing categories into cache
  const existingCats = db.prepare("SELECT id, name FROM categories").all() as { id: number; name: string }[];
  for (const cat of existingCats) {
    categoryCache.set(cat.name, cat.id);
  }

  const importTransaction = db.transaction(() => {
    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      if (fields.length < Math.max(nameIdx, priceIdx) + 1) continue;

      const name = fields[nameIdx]?.trim();
      if (!name) continue;

      const brand = brandIdx >= 0 ? fields[brandIdx]?.trim() : null;
      const cleanBrand = brand === "None" || !brand ? null : brand;
      const ean = eanIdx >= 0 ? fields[eanIdx]?.trim() || null : null;
      const price = priceIdx >= 0 ? parseFloat(fields[priceIdx]) || null : null;
      const grammage = grammageIdx >= 0 ? fields[grammageIdx]?.trim() || null : null;
      const categoryName = categoryIdx >= 0 ? fields[categoryIdx]?.trim() || null : null;
      const imageUrl = imageIdx >= 0 ? fields[imageIdx]?.trim() || null : null;

      // Resolve category
      let categoryId: number | null = null;
      if (categoryName) {
        if (categoryCache.has(categoryName)) {
          categoryId = categoryCache.get(categoryName)!;
        } else {
          maxSortOrder++;
          const icon = getIconForCategory(categoryName);
          const result = insertCategory.run(categoryName, icon, maxSortOrder);
          categoryId = Number(result.lastInsertRowid);
          categoryCache.set(categoryName, categoryId);
          newCategories++;
        }
      }

      // Check for existing product (by EAN or name+brand)
      let existing: { id: number } | undefined;
      if (ean) {
        existing = findProductByEan.get(ean) as { id: number } | undefined;
      }
      if (!existing) {
        existing = findProductByName.get(name, cleanBrand) as { id: number } | undefined;
      }

      if (existing) {
        // Update price, grammage, image, category
        updateProduct.run(price, grammage, imageUrl, categoryId, existing.id);
        skipped++;
      } else {
        insertProduct.run(name, cleanBrand, price, grammage, imageUrl, categoryId, ean);
        imported++;
      }
    }
  });

  importTransaction();

  return { imported, categories: newCategories, skipped };
}

// CLI mode
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Nutzung:");
    console.log("  npx tsx scripts/import-rewe-csv.ts <pfad-zur-csv>");
    console.log("  npx tsx scripts/import-rewe-csv.ts --download");
    process.exit(1);
  }

  let csvPath: string;

  if (args[0] === "--download") {
    const url = "https://github.com/L480/rewe-price-data/releases/latest/download/bavaria.csv";
    csvPath = path.join(DB_DIR, "rewe-products.csv");
    console.log("📥 Lade REWE-Daten herunter...");
    try {
      await downloadCSV(url, csvPath);
      console.log(`✅ CSV heruntergeladen: ${csvPath}`);
    } catch (err) {
      console.error("❌ Download fehlgeschlagen:", err);
      process.exit(1);
    }
  } else {
    csvPath = path.resolve(args[0]);
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ Datei nicht gefunden: ${csvPath}`);
      process.exit(1);
    }
  }

  const content = fs.readFileSync(csvPath, "utf-8");
  console.log(`📄 Lese CSV-Datei (${(content.length / 1024 / 1024).toFixed(1)} MB)...`);

  const result = importCSV(content);
  console.log(`✅ Import abgeschlossen:`);
  console.log(`   ${result.imported} neue Produkte importiert`);
  console.log(`   ${result.skipped} bestehende Produkte aktualisiert`);
  console.log(`   ${result.categories} neue Kategorien erstellt`);

  db.close();
}

main();
