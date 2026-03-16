"use client";

import { useState, useEffect, useCallback } from "react";

interface Category {
  id: number;
  name: string;
  icon: string | null;
}

interface Product {
  id: number;
  name: string;
  brand: string | null;
  price: number | null;
  grammage: string | null;
  image_url: string | null;
  category_id: number | null;
}

interface ListItem {
  id: number;
  product_id: number;
  product_name: string;
  brand: string | null;
  price: number | null;
  image_url: string | null;
  grammage: string | null;
  quantity: number;
}

export default function EinkaufPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showList, setShowList] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendData, setSendData] = useState<{ text: string; whatsappUrl: string; emailUrl: string } | null>(null);
  const [sending, setSending] = useState(false);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
  }, []);

  const loadProducts = useCallback(async () => {
    const params = new URLSearchParams({ active: "1" });
    if (selectedCategory) params.set("category_id", String(selectedCategory));
    const res = await fetch(`/api/products?${params}`);
    setProducts(await res.json());
  }, [selectedCategory]);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/shopping-list");
    const data = await res.json();
    setListItems(data.items || []);
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { loadList(); }, [loadList]);

  const addToList = async (productId: number) => {
    await fetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, quantity: 1 }),
    });
    loadList();
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    await fetch("/api/shopping-list", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, quantity }),
    });
    loadList();
  };

  const removeItem = async (itemId: number) => {
    await fetch(`/api/shopping-list?item_id=${itemId}`, { method: "DELETE" });
    loadList();
  };

  const sendList = async () => {
    setSending(true);
    const res = await fetch("/api/shopping-list/send", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setSendData(data);
      setShowSendDialog(true);
    }
    setSending(false);
  };

  const listTotal = listItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const listCount = listItems.reduce((sum, item) => sum + item.quantity, 0);

  const getQuantityInList = (productId: number) => {
    const item = listItems.find((i) => i.product_id === productId);
    return item?.quantity || 0;
  };

  const getListItem = (productId: number) => {
    return listItems.find((i) => i.product_id === productId);
  };

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="bg-green-700 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Einkaufen</h1>
          <button
            onClick={() => setShowList(!showList)}
            className="relative bg-white text-green-700 px-5 py-2 rounded-full font-bold text-lg hover:bg-green-50 transition"
          >
            Meine Liste
            {listCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-sm w-7 h-7 rounded-full flex items-center justify-center font-bold">
                {listCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Kategorien */}
      {!showList && (
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex-shrink-0 px-5 py-3 rounded-full text-lg font-semibold transition ${
                !selectedCategory ? "bg-green-700 text-white" : "bg-white text-gray-700 shadow"
              }`}
            >
              Alle
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 px-5 py-3 rounded-full text-lg font-semibold transition ${
                  selectedCategory === cat.id ? "bg-green-700 text-white" : "bg-white text-gray-700 shadow"
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Produktliste */}
      {!showList && (
        <div className="max-w-2xl mx-auto px-4 pb-32">
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const qty = getQuantityInList(product.id);
              const item = getListItem(product.id);
              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-2xl shadow-md p-4 flex flex-col items-center text-center transition ${
                    qty > 0 ? "ring-2 ring-green-500" : ""
                  }`}
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center text-4xl mb-3">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      "🛒"
                    )}
                  </div>
                  <h3 className="font-bold text-base leading-tight mb-1">{product.name}</h3>
                  {product.brand && <p className="text-xs text-gray-400">{product.brand}</p>}
                  {product.grammage && <p className="text-xs text-gray-400">{product.grammage}</p>}
                  {product.price && <p className="text-green-700 font-bold text-lg mt-1">{product.price.toFixed(2)} €</p>}

                  {qty === 0 ? (
                    <button
                      onClick={() => addToList(product.id)}
                      className="mt-3 w-full bg-green-600 text-white py-3 rounded-xl text-lg font-bold hover:bg-green-700 active:bg-green-800 transition"
                    >
                      + Hinzufügen
                    </button>
                  ) : (
                    <div className="mt-3 w-full flex items-center justify-center gap-3">
                      <button
                        onClick={() => item && updateQuantity(item.id, qty - 1)}
                        className="w-12 h-12 bg-red-100 text-red-700 rounded-xl text-2xl font-bold hover:bg-red-200 active:bg-red-300 transition"
                      >
                        −
                      </button>
                      <span className="text-2xl font-bold w-8 text-center">{qty}</span>
                      <button
                        onClick={() => addToList(product.id)}
                        className="w-12 h-12 bg-green-100 text-green-700 rounded-xl text-2xl font-bold hover:bg-green-200 active:bg-green-300 transition"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {products.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-xl">
              Keine Produkte in dieser Kategorie.
            </div>
          )}
        </div>
      )}

      {/* Einkaufsliste */}
      {showList && (
        <div className="max-w-2xl mx-auto px-4 py-4 pb-32">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Meine Einkaufsliste</h2>
          {listItems.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-xl">
              Deine Liste ist noch leer.<br />
              Tippe auf &quot;Einkaufen&quot; und füge Produkte hinzu.
            </div>
          ) : (
            <div className="space-y-3">
              {listItems.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl shadow px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg truncate">{item.product_name}</div>
                    <div className="text-sm text-gray-400">
                      {item.brand && <span>{item.brand} · </span>}
                      {item.grammage}
                      {item.price && <span> · {(item.price * item.quantity).toFixed(2)} €</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-10 h-10 bg-red-100 text-red-700 rounded-lg text-xl font-bold"
                    >
                      −
                    </button>
                    <span className="text-xl font-bold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-10 h-10 bg-green-100 text-green-700 rounded-lg text-xl font-bold"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-10 h-10 bg-gray-100 text-gray-400 rounded-lg text-lg ml-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              <div className="bg-green-50 rounded-2xl p-5 mt-4">
                <div className="flex justify-between text-xl font-bold text-green-800">
                  <span>{listCount} Artikel</span>
                  <span>ca. {listTotal.toFixed(2)} €</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer: Liste senden */}
      {listItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-30">
          <div className="max-w-2xl mx-auto px-4 py-4 flex gap-3">
            {!showList && (
              <button
                onClick={() => setShowList(true)}
                className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl text-lg font-bold"
              >
                Liste ({listCount})
              </button>
            )}
            <button
              onClick={sendList}
              disabled={sending}
              className="flex-1 bg-green-600 text-white py-4 rounded-xl text-xl font-bold hover:bg-green-700 active:bg-green-800 transition disabled:opacity-50"
            >
              {sending ? "Wird gesendet..." : "Liste senden"}
            </button>
          </div>
        </div>
      )}

      {/* Send Dialog */}
      {showSendDialog && sendData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Liste senden</h2>
            <p className="text-gray-500 mb-6">Wähle, wie du die Liste verschicken möchtest:</p>

            <div className="space-y-3">
              <a
                href={sendData.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-green-500 text-white py-4 rounded-xl text-xl font-bold text-center hover:bg-green-600 transition"
              >
                Per WhatsApp senden
              </a>
              <a
                href={sendData.emailUrl}
                className="block w-full bg-blue-500 text-white py-4 rounded-xl text-xl font-bold text-center hover:bg-blue-600 transition"
              >
                Per E-Mail senden
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sendData.text);
                  alert("Liste in die Zwischenablage kopiert!");
                }}
                className="block w-full bg-gray-200 text-gray-700 py-4 rounded-xl text-xl font-bold text-center hover:bg-gray-300 transition"
              >
                Text kopieren
              </button>
            </div>

            <button
              onClick={() => {
                setShowSendDialog(false);
                setSendData(null);
                loadList();
              }}
              className="mt-4 w-full text-gray-400 py-2 text-lg"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
