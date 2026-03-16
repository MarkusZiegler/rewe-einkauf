import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export function GET() {
  const db = getDb();
  const categories = db.prepare("SELECT * FROM categories ORDER BY sort_order, name").all();
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  const result = db
    .prepare("INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)")
    .run(body.name, body.icon || null, body.sort_order || 0);
  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  db.prepare("UPDATE categories SET name = ?, icon = ?, sort_order = ? WHERE id = ?").run(
    body.name,
    body.icon || null,
    body.sort_order || 0,
    body.id
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getDb();
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
