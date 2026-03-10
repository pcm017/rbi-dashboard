"""
RBI ATM/POS/Card Statistics scraper.
Fetches new Excel files from RBI's ATMView page and saves them to public/data/.
Also updates public/data/manifest.json so the dashboard knows what's available.
"""

import json
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
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer":    "https://www.rbi.org.in/Scripts/ATMView.aspx",
    "Accept":     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*",
}
SLEEP_BETWEEN = 2

# ── Month detection ───────────────────────────────────────────────────────────
MONTH_NAMES = [
    "january","february","march","april","may","june",
    "july","august","september","october","november","december"
]

def detect_month_label(url: str, link_text: str) -> str | None:
    src = (url + " " + link_text).lower()
    year_match = re.search(r"20\d\d", src)
    year = year_match.group() if year_match else None
    # Handle "ATM122025..." style filenames (numeric month before year)
    num_match = re.search(r'atm(\d{2})20\d\d', src)
    if num_match:
        month_num = int(num_match.group(1))
        if 1 <= month_num <= 12:
            return f"{MONTH_NAMES[month_num-1].capitalize()} {year}"
    for m in MONTH_NAMES:
        if m in src:
            return f"{m.capitalize()} {year}" if year else m.capitalize()
    return None

# ── Helpers ───────────────────────────────────────────────────────────────────
def load_manifest() -> dict:
    if MANIFEST_FILE.exists():
        return json.loads(MANIFEST_FILE.read_text())
    return {"files": []}

def save_manifest(manifest: dict):
    MANIFEST_FILE.write_text(json.dumps(manifest, indent=2))
    print(f"  ✓ Manifest updated ({len(manifest['files'])} files)")

def is_valid_xlsx(content: bytes) -> bool:
    # XLSX files are ZIP archives — they start with PK magic bytes
    return content[:2] == b'PK'

# ── Main ──────────────────────────────────────────────────────────────────────
def scrape():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    manifest = load_manifest()
    existing_urls = {f["url"] for f in manifest["files"]}

    # Also delete any previously saved bad files (HTML saved as XLSX)
    for f in manifest["files"]:
        dest = DATA_DIR / f["filename"]
        if dest.exists() and not is_valid_xlsx(dest.read_bytes()):
            print(f"  removing bad file: {f['filename'][:50]}")
            dest.unlink()
            existing_urls.discard(f["url"])

    print(f"Fetching RBI index: {RBI_INDEX_URL}")
    resp = requests.get(RBI_INDEX_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")

    xlsx_links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.upper().endswith(".XLSX") and "rbidocs.rbi.org.in" in href:
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

            # Validate it's actually an Excel file, not an HTML error page
            if not is_valid_xlsx(r.content):
                print(f"  ✗ skipped (got HTML instead of Excel, RBI may be blocking): {filename[:40]}")
                continue

            dest.write_bytes(r.content)
            new_files.append({
                "url":      url,
                "filename": filename,
                "month":    month_label,
                "size":     len(r.content),
            })
            print(f"  ✓ saved ({len(r.content):,} bytes)")
            time.sleep(SLEEP_BETWEEN)
        except Exception as e:
            print(f"  ✗ failed: {e}")

    # Remove bad entries from manifest (files that failed validation)
    manifest["files"] = [
        f for f in manifest["files"]
        if (DATA_DIR / f["filename"]).exists() and is_valid_xlsx((DATA_DIR / f["filename"]).read_bytes())
    ]

    if new_files:
        manifest["files"].extend(new_files)

    manifest["files"].sort(key=lambda f: f.get("month") or "", reverse=True)
    save_manifest(manifest)

    if new_files:
        print(f"\n✓ Downloaded {len(new_files)} new valid file(s)")
    else:
        print("\n✓ No new files — manifest unchanged")

if __name__ == "__main__":
    scrape()
