import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "1";
  const categoryId = searchParams.get("category_id");
  const search = searchParams.get("search");

  const db = getDb();
  let query = `
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (activeOnly) {
    query += " AND p.is_active = 1";
  }
  if (categoryId) {
    query += " AND p.category_id = ?";
    params.push(Number(categoryId));
  }
  if (search) {
    query += " AND (p.name LIKE ? OR p.brand LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  query += " ORDER BY p.name";

  const products = db.prepare(query).all(...params);
  return NextResponse.json(products);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const db = getDb();

  if (body.toggle_active !== undefined) {
    db.prepare("UPDATE products SET is_active = ? WHERE id = ?").run(
      body.toggle_active ? 1 : 0,
      body.id
    );
    return NextResponse.json({ success: true });
  }

  db.prepare(`
    UPDATE products SET name = ?, brand = ?, price = ?, price_unit = ?,
    image_url = ?, category_id = ?, grammage = ?, is_active = ? WHERE id = ?
  `).run(
    body.name, body.brand, body.price, body.price_unit,
    body.image_url, body.category_id, body.grammage, body.is_active ? 1 : 0, body.id
  );
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO products (name, brand, price, price_unit, image_url, category_id, ean, grammage, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.name, body.brand || null, body.price || null, body.price_unit || null,
    body.image_url || null, body.category_id || null, body.ean || null,
    body.grammage || null, body.is_active ? 1 : 0
  );
  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
