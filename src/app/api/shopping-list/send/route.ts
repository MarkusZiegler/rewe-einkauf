import { getDb } from "@/lib/db";
import { NextResponse } from "next/server";

// Generate a shareable list text and mark as sent
export async function POST() {
  const db = getDb();
  const list = db.prepare("SELECT * FROM shopping_lists WHERE status = 'draft' ORDER BY created_at DESC LIMIT 1").get() as Record<string, unknown> | undefined;

  if (!list) {
    return NextResponse.json({ error: "Keine aktive Einkaufsliste" }, { status: 404 });
  }

  const items = db.prepare(`
    SELECT sli.quantity, sli.note, p.name as product_name, p.brand, p.price, p.grammage
    FROM shopping_list_items sli
    JOIN products p ON sli.product_id = p.id
    WHERE sli.list_id = ?
    ORDER BY p.name
  `).all(list.id) as Array<{
    quantity: number;
    note: string | null;
    product_name: string;
    brand: string | null;
    price: number | null;
    grammage: string | null;
  }>;

  if (items.length === 0) {
    return NextResponse.json({ error: "Die Einkaufsliste ist leer" }, { status: 400 });
  }

  // Generate text
  const date = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let text = `🛒 Einkaufsliste vom ${date}\n\n`;
  let total = 0;

  for (const item of items) {
    const brand = item.brand ? ` (${item.brand})` : "";
    const price = item.price ? ` - ${(item.price * item.quantity).toFixed(2)} €` : "";
    const note = item.note ? ` [${item.note}]` : "";
    const grammage = item.grammage ? ` ${item.grammage}` : "";

    text += `• ${item.quantity}x ${item.product_name}${brand}${grammage}${price}${note}\n`;

    if (item.price) {
      total += item.price * item.quantity;
    }
  }

  if (total > 0) {
    text += `\n💰 Geschätzt: ${total.toFixed(2)} €`;
  }

  // Mark list as sent and create new draft
  db.prepare("UPDATE shopping_lists SET status = 'sent', sent_at = datetime('now') WHERE id = ?").run(list.id);

  // WhatsApp link (URL encoded)
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  // Email mailto link
  const emailSubject = `Einkaufsliste vom ${date}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(text)}`;

  return NextResponse.json({
    text,
    whatsappUrl,
    emailUrl,
    itemCount: items.length,
    estimatedTotal: total,
  });
}
