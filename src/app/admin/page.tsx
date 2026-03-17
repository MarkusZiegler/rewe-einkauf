"use client";

import { useState, useEffect, useCallback } from "react";

interface Category {
  id: number;
  name: string;
  icon: string | null;
  sort_order: number;
}

interface Product {
  id: number;
  name: string;
  brand: string | null;
  price: number | null;
  grammage: string | null;
  image_url: string | null;
  category_id: number | null;
  category_name: string | null;
  is_active: number;
}

interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  newCategories: number;
  totalLines: number;
  error?: string;
}

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [newProduct, setNewProduct] = useState({ name: "", brand: "", price: "", grammage: "", category_id: "" });
  const [newCategory, setNewCategory] = useState({ name: "", icon: "", sort_order: "0" });

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
  }, []);

  const loadProducts = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterCategory) params.set("category_id", filterCategory);
    const res = await fetch(`/api/products?${params}`);
    setProducts(await res.json());
  }, [search, filterCategory]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { loadProducts(); }, [loadProducts]);

  const toggleActive = async (product: Product) => {
    await fetch("/api/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id, toggle_active: !product.is_active }),
    });
    loadProducts();
  };

  const addProduct = async () => {
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newProduct,
        price: newProduct.price ? parseFloat(newProduct.price) : null,
        category_id: newProduct.category_id ? parseInt(newProduct.category_id) : null,
        is_active: true,
      }),
    });
    setNewProduct({ name: "", brand: "", price: "", grammage: "", category_id: "" });
    setShowAddProduct(false);
    loadProducts();
  };

  const addCategory = async () => {
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newCategory.name,
        icon: newCategory.icon || null,
        sort_order: parseInt(newCategory.sort_order) || 0,
      }),
    });
    setNewCategory({ name: "", icon: "", sort_order: "0" });
    setShowAddCategory(false);
    loadCategories();
  };

  const deleteCategory = async (id: number) => {
    if (!confirm("Kategorie wirklich löschen?")) return;
    await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
    loadCategories();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setImportResult(data);
        loadProducts();
        loadCategories();
      } else {
        setImportResult({ success: false, imported: 0, updated: 0, newCategories: 0, totalLines: 0, error: data.error });
      }
    } catch {
      setImportResult({ success: false, imported: 0, updated: 0, newCategories: 0, totalLines: 0, error: "Netzwerkfehler" });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const activeCount = products.filter((p) => p.is_active).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin-Bereich</h1>
            <p className="text-sm text-gray-500">
              {activeCount} von {products.length} Produkten im Sortiment
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImport(!showImport)}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
            >
              CSV Import
            </button>
            <a href="/einkauf" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Zur Einkaufs-Ansicht →
            </a>
          </div>
        </div>
      </header>

      {showImport && (
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <h2 className="font-semibold text-lg mb-2">REWE-Produkte aus CSV importieren</h2>
            <p className="text-sm text-gray-600 mb-4">
              Lade eine CSV-Datei im Format von{" "}
              <span className="font-mono text-xs">L480/rewe-price-data</span> hoch
              (Spalten: name, brand, ean, price, grammage, category, sale, image).
              Neue Produkte werden als <strong>inaktiv</strong> importiert – du kannst sie dann einzeln aktivieren.
            </p>
            <div className="flex items-center gap-4">
              <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white ${importing ? "bg-gray-400" : "bg-orange-500 hover:bg-orange-600"}`}>
                {importing ? "Importiere..." : "CSV-Datei auswählen"}
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  disabled={importing}
                  className="hidden"
                />
              </label>
              {importing && <span className="text-sm text-gray-500">Das kann bei großen Dateien einen Moment dauern...</span>}
            </div>
            {importResult && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${importResult.error ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                {importResult.error ? (
                  <p>Fehler: {importResult.error}</p>
                ) : (
                  <div>
                    <p className="font-semibold">Import erfolgreich!</p>
                    <p>{importResult.imported} neue Produkte importiert</p>
                    <p>{importResult.updated} bestehende Produkte aktualisiert</p>
                    {importResult.newCategories > 0 && (
                      <p>{importResult.newCategories} neue Kategorien erstellt</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Kategorien */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">Kategorien</h2>
              <button onClick={() => setShowAddCategory(!showAddCategory)} className="text-blue-600 text-sm hover:underline">
                + Neu
              </button>
            </div>

            {showAddCategory && (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg space-y-2">
                <input
                  placeholder="Name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
                <input
                  placeholder="Icon (Emoji)"
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
                <button onClick={addCategory} className="w-full bg-blue-600 text-white text-sm py-1 rounded hover:bg-blue-700">
                  Speichern
                </button>
              </div>
            )}

            <div className="space-y-1">
              <button
                onClick={() => setFilterCategory("")}
                className={`w-full text-left px-3 py-2 rounded text-sm ${!filterCategory ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}`}
              >
                Alle
              </button>
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center group">
                  <button
                    onClick={() => setFilterCategory(String(cat.id))}
                    className={`flex-1 text-left px-3 py-2 rounded text-sm ${filterCategory === String(cat.id) ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 px-2 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hauptbereich: Produkte */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Produkt suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 border rounded-lg px-4 py-2"
              />
              <button
                onClick={() => setShowAddProduct(!showAddProduct)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap"
              >
                + Produkt
              </button>
            </div>
          </div>

          {showAddProduct && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <h3 className="font-semibold mb-3">Neues Produkt hinzufügen</h3>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Name *" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="border rounded px-3 py-2" />
                <input placeholder="Marke" value={newProduct.brand} onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })} className="border rounded px-3 py-2" />
                <input placeholder="Preis (€)" type="number" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} className="border rounded px-3 py-2" />
                <input placeholder="Menge (z.B. 500 g)" value={newProduct.grammage} onChange={(e) => setNewProduct({ ...newProduct, grammage: e.target.value })} className="border rounded px-3 py-2" />
                <select value={newProduct.category_id} onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })} className="border rounded px-3 py-2">
                  <option value="">Kategorie wählen</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
                <button onClick={addProduct} disabled={!newProduct.name} className="bg-green-600 text-white rounded py-2 hover:bg-green-700 disabled:opacity-50">
                  Hinzufügen
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {products.map((product) => (
              <div key={product.id} className={`bg-white rounded-lg shadow px-4 py-3 flex items-center gap-4 ${product.is_active ? "border-l-4 border-green-500" : "opacity-60"}`}>
                <button
                  onClick={() => toggleActive(product)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${product.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}
                >
                  {product.is_active ? "✓" : "○"}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{product.name}</div>
                  <div className="text-sm text-gray-500">
                    {product.brand && <span>{product.brand} · </span>}
                    {product.grammage && <span>{product.grammage} · </span>}
                    {product.category_name && <span>{product.category_name}</span>}
                  </div>
                </div>
                {product.price && (
                  <div className="text-right font-semibold text-gray-700 flex-shrink-0">
                    {product.price.toFixed(2)} €
                  </div>
                )}
              </div>
            ))}
            {products.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                Keine Produkte gefunden. Füge Produkte hinzu oder importiere REWE-Daten.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
