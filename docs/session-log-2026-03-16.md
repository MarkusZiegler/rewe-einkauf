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

## Geplante Architektur
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
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```
- Next.js Projekt mit TypeScript, Tailwind CSS, ESLint, App Router, src-Verzeichnis

### 2. SQLite installiert
```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

### Nächste Schritte (geplant)
- [ ] Datenbank-Schema erstellen (Produkte, Kategorien, Einkaufslisten)
- [ ] REWE-Produktdaten importieren
- [ ] Admin-Backend bauen
- [ ] Einfaches Frontend für ältere Nutzer
- [ ] Liste-senden-Funktion (E-Mail/WhatsApp)
