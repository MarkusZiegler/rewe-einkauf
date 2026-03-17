import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Keine Datei hochgeladen" }, { status: 400 });
    }

    const csvContent = await file.text();
    const lines = csvContent.split("\n").filter((l) => l.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV-Datei ist leer" }, { status: 400 });
    }

    const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
    const nameIdx = header.indexOf("name");
    const brandIdx = header.indexOf("brand");
    const eanIdx = header.indexOf("ean");
    const priceIdx = header.indexOf("price");
    const grammageIdx = header.indexOf("grammage");
    const categoryIdx = header.indexOf("category");
    const imageIdx = header.indexOf("image");

    if (nameIdx === -1 || priceIdx === -1) {
      return NextResponse.json(
        { error: "CSV muss mindestens die Spalten 'name' und 'price' enthalten." },
        { status: 400 }
      );
    }

    const db = getDb();

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
    let maxSortOrder =
      (db.prepare("SELECT MAX(sort_order) as m FROM categories").get() as { m: number | null })
        ?.m || 0;

    // Load existing categories
    const existingCats = db.prepare("SELECT id, name FROM categories").all() as {
      id: number;
      name: string;
    }[];
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

        // Check for existing product
        let existing: { id: number } | undefined;
        if (ean) {
          existing = findProductByEan.get(ean) as { id: number } | undefined;
        }
        if (!existing) {
          existing = findProductByName.get(name, cleanBrand) as { id: number } | undefined;
        }

        if (existing) {
          updateProduct.run(price, grammage, imageUrl, categoryId, existing.id);
          skipped++;
        } else {
          insertProduct.run(name, cleanBrand, price, grammage, imageUrl, categoryId, ean);
          imported++;
        }
      }
    });

    importTransaction();

    return NextResponse.json({
      success: true,
      imported,
      updated: skipped,
      newCategories,
      totalLines: lines.length - 1,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import fehlgeschlagen" },
      { status: 500 }
    );
  }
}
