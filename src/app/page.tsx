import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-green-800 mb-2">Einkaufshilfe</h1>
      <p className="text-gray-500 mb-12 text-lg">Einfach einkaufen, einfach senden.</p>

      <div className="grid gap-6 w-full max-w-md">
        <Link
          href="/einkauf"
          className="bg-green-600 text-white rounded-2xl p-8 text-center shadow-lg hover:bg-green-700 active:bg-green-800 transition"
        >
          <div className="text-5xl mb-3">🛒</div>
          <div className="text-2xl font-bold">Einkaufen</div>
          <div className="text-green-200 mt-1">Produkte aussuchen &amp; Liste senden</div>
        </Link>

        <Link
          href="/admin"
          className="bg-white text-gray-700 rounded-2xl p-6 text-center shadow hover:bg-gray-50 transition border"
        >
          <div className="text-3xl mb-2">⚙️</div>
          <div className="text-lg font-semibold">Verwaltung</div>
          <div className="text-gray-400 text-sm">Produkte &amp; Kategorien verwalten</div>
        </Link>
      </div>
    </div>
  );
}
