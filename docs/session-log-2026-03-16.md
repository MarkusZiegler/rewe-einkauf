# Session Log – 16. März 2026

## Zusammenfassung
Erstellung einer vereinfachten Einkaufshilfe basierend auf dem REWE Online-Shop (rewe.de/shop/).

## Anforderungen (vom Nutzer)
- **Zielgruppe**: Ältere Angehörige → besonders einfache Bedienung
- **Hauptfunktion**: Einkaufsliste erstellen und an den Admin (Familienmitglied) senden
- **Admin-Backend**: Der Admin wählt aus dem gesamten REWE-Sortiment die Produkte aus, die für die ältere Person sichtbar sein sollen
- **Bestellung**: Die ältere Person stellt eine Liste zusammen → wird per E-Mail/WhatsApp an den Admin gesendet → Admin bestellt bei REWE
- **Plattform**: Web-App (Browser)
- **Tech-Stack**: Next.js + SQLite + Tailwind CSS (von Claude gewählt)

## Recherche: REWE API
- **Keine offizielle API** vorhanden
- Seit März 2024: mTLS-Schutz (Cloudflare) → API-Zugriff erschwert
- Direkte Bestellung über API ist **nicht möglich**
- **Produktdaten** können importiert werden:
  - GitHub-Repo `L480/rewe-price-data` (tägliche CSV mit allen REWE-Artikeln)
  - `rewerse-engineering` Projekt (Go + Python Wrapper)
  - Diverse Scraper-Projekte
- Community-Projekte beschränken sich auf **Lese-Zugriff** (Produkte, Preise, Angebote)

## Architektur
```
┌─────────────────────────────────────┐
│  Admin-Backend (für dich)           │
│  - REWE-Produkte importieren (CSV)  │
│  - Sortiment zusammenstellen        │
│  - Kategorien verwalten             │
└──────────────┬──────────────────────┘
               │ SQLite DB
┌──────────────┴──────────────────────┐
│  Frontend (für ältere Person)       │
│  - Große Kacheln mit Bildern        │
│  - Wenige klare Kategorien          │
│  - Menge auswählen                  │
│  - "Liste senden" → E-Mail/WhatsApp │
└─────────────────────────────────────┘
```

## Durchgeführte Schritte

### 1. Projekt initialisiert
- Next.js mit TypeScript, Tailwind CSS, ESLint, App Router, src-Verzeichnis
- SQLite (better-sqlite3) installiert
- Systemfonts statt Google Fonts (Offline-Kompatibilität)

### 2. Datenbank-Schema erstellt (`src/lib/db.ts`)
- Tabellen: `categories`, `products`, `shopping_lists`, `shopping_list_items`
- Indizes für Performance

### 3. Seed-Script (`scripts/seed.ts`)
- 10 Kategorien (Obst & Gemüse, Brot, Milchprodukte, etc.)
- 31 Beispiel-Produkte mit realistischen Preisen
- Ausführen: `npm run seed`

### 4. API-Routen erstellt
- `GET/POST/PUT/DELETE /api/categories` – Kategorien CRUD
- `GET/POST/PUT /api/products` – Produkte CRUD + Suche/Filter
- `GET/POST/PUT/DELETE /api/shopping-list` – Einkaufsliste verwalten
- `POST /api/shopping-list/send` – Liste als Text generieren + WhatsApp/E-Mail-Links

### 5. Admin-Backend (`/admin`)
- Kategorien erstellen/löschen (Sidebar)
- Produkte suchen, nach Kategorie filtern
- Produkte per Toggle aktivieren/deaktivieren
- Neue Produkte manuell hinzufügen

### 6. Einkaufs-Frontend (`/einkauf`)
- Große Kacheln mit Produktname, Preis, Menge
- Horizontaler Kategorie-Filter
- Warenkorb mit +/- Buttons und Artikelzähler
- "Liste senden" Dialog: WhatsApp, E-Mail oder Text kopieren

### 7. Startseite (`/`)
- Große Kacheln: "Einkaufen" und "Verwaltung"

## Git
- Branch: `claude/review-deleted-content-VvpKi`
- 2 Commits gepusht
- PR konnte nicht automatisch erstellt werden (kein `gh` CLI verfügbar)

## Starten
```bash
npm run seed   # Datenbank mit Beispieldaten füllen
npm run dev    # Entwicklungsserver starten (localhost:3000)
```

## Nächste Schritte (für eine spätere Session)
- [ ] REWE-CSV-Import (echte Produktdaten aus `L480/rewe-price-data`)
- [ ] Produktbilder hinzufügen
- [ ] Admin-Authentifizierung (einfaches Passwort)
- [ ] PWA-Support (Offline, Homescreen-Icon)
- [ ] Favoriten / "Letzte Einkäufe" für die ältere Person
- [ ] Pull Request erstellen
