"""
RBI ATM/POS/Card Statistics scraper.
Fetches new Excel files from RBI's ATMView page and saves them to public/data/.
Also updates public/data/manifest.json so the dashboard knows what's available.
"""

import json
import os
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ── Config ────────────────────────────────────────────────────────────────────
RBI_INDEX_URL = "https://www.rbi.org.in/Scripts/ATMView.aspx"
DATA_DIR      = Path(__file__).parent.parent / "public" / "data"
MANIFEST_FILE = DATA_DIR / "manifest.json"
HEADERS       = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; rbi-dashboard-bot/1.0; "
        "+https://github.com/YOUR_USERNAME/rbi-dashboard)"
    )
}
SLEEP_BETWEEN = 2   # seconds between downloads — be polite to RBI's servers

# ── Month detection ───────────────────────────────────────────────────────────
MONTH_NAMES = [
    "january","february","march","april","may","june",
    "july","august","september","october","november","december"
]

def detect_month_label(url: str, link_text: str) -> str | None:
    """Try to extract 'Month YYYY' from a URL or link text."""
    src = (url + " " + link_text).lower()
    year_match = re.search(r"20\d\d", src)
    year = year_match.group() if year_match else None
    for m in MONTH_NAMES:
        if m in src:
            return f"{m.capitalize()} {year}" if year else m.capitalize()
    return None

# ── Main ──────────────────────────────────────────────────────────────────────
def load_manifest() -> dict:
    if MANIFEST_FILE.exists():
        return json.loads(MANIFEST_FILE.read_text())
    return {"files": []}

def save_manifest(manifest: dict):
    MANIFEST_FILE.write_text(json.dumps(manifest, indent=2))
    print(f"  ✓ Manifest updated ({len(manifest['files'])} files)")

def scrape():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    manifest = load_manifest()
    existing_urls = {f["url"] for f in manifest["files"]}

    print(f"Fetching RBI index: {RBI_INDEX_URL}")
    resp = requests.get(RBI_INDEX_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")

    # Find all .XLSX links
    xlsx_links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.upper().endswith(".XLSX") and "rbidocs.rbi.org.in" in href:
            # Only include "Document" links (not PDF links)
            if "/ATM/DOCs/" in href:
                xlsx_links.append((href, a.get_text(strip=True)))

    print(f"Found {len(xlsx_links)} Excel links on page")

    new_files = []
    for url, text in xlsx_links:
        if url in existing_urls:
            print(f"  skip (already have): {url.split('/')[-1][:40]}")
            continue

        month_label = detect_month_label(url, text)
        filename    = url.split("/")[-1]
        dest        = DATA_DIR / filename

        print(f"  downloading: {filename[:50]} → {month_label}")
        try:
            r = requests.get(url, headers=HEADERS, timeout=60)
            r.raise_for_status()
            dest.write_bytes(r.content)
            new_files.append({
                "url":      url,
                "filename": filename,
                "month":    month_label,
                "size":     len(r.content),
            })
            time.sleep(SLEEP_BETWEEN)
        except Exception as e:
            print(f"  ✗ failed: {e}")

    if new_files:
        manifest["files"].extend(new_files)
        # Sort by month (newest first for convenience)
        manifest["files"].sort(key=lambda f: f.get("month", ""), reverse=True)
        save_manifest(manifest)
        print(f"\n✓ Downloaded {len(new_files)} new file(s)")
    else:
        print("\n✓ No new files — manifest unchanged")

if __name__ == "__main__":
    scrape()
