import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Get current draft list (or create one)
export function GET() {
  const db = getDb();
  let list = db.prepare("SELECT * FROM shopping_lists WHERE status = 'draft' ORDER BY created_at DESC LIMIT 1").get() as Record<string, unknown> | undefined;

  if (!list) {
    const result = db.prepare("INSERT INTO shopping_lists (name, status) VALUES ('Einkaufsliste', 'draft')").run();
    list = db.prepare("SELECT * FROM shopping_lists WHERE id = ?").get(result.lastInsertRowid) as Record<string, unknown>;
  }

  const items = db.prepare(`
    SELECT sli.*, p.name as product_name, p.brand, p.price, p.image_url, p.grammage
    FROM shopping_list_items sli
    JOIN products p ON sli.product_id = p.id
    WHERE sli.list_id = ?
    ORDER BY p.name
  `).all(list.id);

  return NextResponse.json({ list, items });
}

// Add item to list
export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();

  let list = db.prepare("SELECT * FROM shopping_lists WHERE status = 'draft' ORDER BY created_at DESC LIMIT 1").get() as Record<string, unknown> | undefined;
  if (!list) {
    const result = db.prepare("INSERT INTO shopping_lists (name, status) VALUES ('Einkaufsliste', 'draft')").run();
    list = { id: result.lastInsertRowid };
  }

  // Check if product already in list
  const existing = db.prepare(
    "SELECT * FROM shopping_list_items WHERE list_id = ? AND product_id = ?"
  ).get(list.id, body.product_id) as Record<string, unknown> | undefined;

  if (existing) {
    db.prepare("UPDATE shopping_list_items SET quantity = quantity + ? WHERE id = ?").run(
      body.quantity || 1,
      existing.id
    );
  } else {
    db.prepare(
      "INSERT INTO shopping_list_items (list_id, product_id, quantity, note) VALUES (?, ?, ?, ?)"
    ).run(list.id, body.product_id, body.quantity || 1, body.note || null);
  }

  return NextResponse.json({ success: true });
}

// Update item quantity
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const db = getDb();

  if (body.quantity <= 0) {
    db.prepare("DELETE FROM shopping_list_items WHERE id = ?").run(body.item_id);
  } else {
    db.prepare("UPDATE shopping_list_items SET quantity = ? WHERE id = ?").run(
      body.quantity,
      body.item_id
    );
  }

  return NextResponse.json({ success: true });
}

// Delete item from list
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("item_id");
  const clearAll = searchParams.get("clear_all");

  const db = getDb();

  if (clearAll === "1") {
    const list = db.prepare("SELECT id FROM shopping_lists WHERE status = 'draft' ORDER BY created_at DESC LIMIT 1").get() as Record<string, unknown> | undefined;
    if (list) {
      db.prepare("DELETE FROM shopping_list_items WHERE list_id = ?").run(list.id);
    }
  } else if (itemId) {
    db.prepare("DELETE FROM shopping_list_items WHERE id = ?").run(itemId);
  }

  return NextResponse.json({ success: true });
}
