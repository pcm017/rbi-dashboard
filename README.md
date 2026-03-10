# RBI Banking Infrastructure Dashboard

Live dashboard tracking India's ATM, PoS, and Card infrastructure using data from the Reserve Bank of India.

**Live URL:** `https://YOUR_USERNAME.github.io/rbi-dashboard/`

---

## What it tracks

**Phase 1 — Raw Data**
- Total ATMs (On-site / Off-site)
- PoS Terminals
- Micro ATMs, Bharat QR, UPI QR Codes
- Credit & Debit Cards outstanding
- Bank-level leaderboards

**Phase 2 — Insights**
- Digital Infra Index (PoS + UPI QR + Bharat QR) ÷ ATMs
- Cash Infra Ratio (ATMs ÷ PoS) — declining = structural shift
- Credit Card Penetration by bank
- Market share dynamics + rank changes
- Outperformer flags (bank growth vs industry)
- Off-site ATM % (inclusion proxy)
- Bank Scorecard across all 4 stories

---

## Setup (one-time)

### 1. Fork / clone this repo

```bash
git clone https://github.com/YOUR_USERNAME/rbi-dashboard.git
cd rbi-dashboard
```

### 2. Enable GitHub Pages

Go to **Settings → Pages → Source → GitHub Actions**

### 3. Run the scraper once to seed data

```bash
pip install requests beautifulsoup4 lxml
python scripts/scrape.py
git add public/data/
git commit -m "seed: initial RBI data"
git push
```

This downloads all available Excel files from RBI's ATMView page into `public/data/`.

### 4. Push to GitHub

The deploy workflow triggers automatically on every push to `main`.
Your dashboard will be live at `https://YOUR_USERNAME.github.io/rbi-dashboard/`

---

## How data stays fresh

`.github/workflows/sync.yml` runs on the **5th of every month** (RBI usually publishes by then):

1. Fetches `https://www.rbi.org.in/Scripts/ATMView.aspx`
2. Finds new `.XLSX` links not already in `public/data/`
3. Downloads them and commits to the repo
4. Triggers a new dashboard deploy automatically

You can also trigger it manually from **Actions → Sync RBI ATM Data → Run workflow**.

---

## Local development

```bash
npm install
npm run dev
```

The app will try to load `public/data/manifest.json` on startup.
If not found (first run without scraping), it falls back to the manual upload UI.

```bash
npm run build    # production build → dist/
npm run preview  # preview the build locally
```

---

## Repo structure

```
rbi-dashboard/
├── public/
│   └── data/                  ← Excel files + manifest.json (auto-managed)
├── src/
│   ├── main.jsx               ← React entry
│   ├── App.jsx                ← Main dashboard + all Phase 1 tabs
│   ├── InsightsTab.jsx        ← Phase 2 derived metrics
│   ├── metrics.js             ← All derived metric calculations
│   ├── parser.js              ← Excel parser (column mapping)
│   └── components.jsx         ← Shared UI components
├── scripts/
│   └── scrape.py              ← RBI scraper
├── .github/workflows/
│   ├── sync.yml               ← Monthly data sync
│   └── deploy.yml             ← Build + deploy to GitHub Pages
├── index.html
├── vite.config.js
└── package.json
```

---

## Data source

Reserve Bank of India — [Bankwise ATM/POS/Card Statistics](https://www.rbi.org.in/Scripts/ATMView.aspx)

Data is provisional as published by RBI. This dashboard is not affiliated with RBI.
