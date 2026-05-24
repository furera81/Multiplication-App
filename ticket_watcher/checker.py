#!/usr/bin/env python3
"""
World Cup 2026 Boston Ticket Price Watcher
Checks TickPick, StubHub, Ticketmaster, SeatGeek, and Vivid Seats hourly.
Sends email when any ticket falls below your configured price threshold.
"""

import json
import logging
import os
import re
import smtplib
import ssl
import time
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional

import requests
import schedule
from bs4 import BeautifulSoup

# ── Configuration ──────────────────────────────────────────────────────────────

CONFIG_PATH = Path(__file__).parent / "config.json"
NOTIFIED_PATH = Path(__file__).parent / "notified_prices.json"

BOSTON_GAMES = [
    {"label": "Haiti vs Scotland (Jun 13)",    "date": "2026-06-13", "teams": ("Haiti", "Scotland")},
    {"label": "Iraq vs Norway (Jun 16)",        "date": "2026-06-16", "teams": ("Iraq", "Norway")},
    {"label": "Scotland vs Morocco (Jun 19)",   "date": "2026-06-19", "teams": ("Scotland", "Morocco")},
    {"label": "England vs Ghana (Jun 23)",      "date": "2026-06-23", "teams": ("England", "Ghana")},
    {"label": "Norway vs France (Jun 26)",      "date": "2026-06-26", "teams": ("Norway", "France")},
    {"label": "Round of 32 (Jun 29)",           "date": "2026-06-29", "teams": ()},
    {"label": "Quarterfinal (Jul 9)",           "date": "2026-07-09", "teams": ()},
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def load_config() -> dict:
    with open(CONFIG_PATH) as f:
        return json.load(f)


def load_notified() -> dict:
    if NOTIFIED_PATH.exists():
        with open(NOTIFIED_PATH) as f:
            return json.load(f)
    return {}


def save_notified(data: dict) -> None:
    with open(NOTIFIED_PATH, "w") as f:
        json.dump(data, f, indent=2)


def setup_logging(log_file: str) -> None:
    log_path = Path(__file__).parent / log_file
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(log_path),
            logging.StreamHandler(),
        ],
    )


# ── Scrapers ───────────────────────────────────────────────────────────────────

def fetch_ticketmaster(game: dict, api_key: str) -> Optional[float]:
    """Ticketmaster Discovery API – free key from developer.ticketmaster.com"""
    if not api_key or api_key.startswith("YOUR_"):
        return None
    try:
        teams = " ".join(game["teams"]) if game["teams"] else "FIFA World Cup"
        url = "https://app.ticketmaster.com/discovery/v2/events.json"
        params = {
            "apikey": api_key,
            "keyword": f"FIFA World Cup 2026 {teams}",
            "city": "Foxborough",
            "stateCode": "MA",
            "startDateTime": f"{game['date']}T00:00:00Z",
            "endDateTime": f"{game['date']}T23:59:59Z",
        }
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        events = data.get("_embedded", {}).get("events", [])
        prices = []
        for event in events:
            for pp in event.get("priceRanges", []):
                if "min" in pp:
                    prices.append(float(pp["min"]))
        if prices:
            logging.info(f"  Ticketmaster [{game['label']}]: min=${min(prices):.0f}")
            return min(prices)
    except Exception as e:
        logging.warning(f"  Ticketmaster error [{game['label']}]: {e}")
    return None


def fetch_seatgeek(game: dict, client_id: str, client_secret: str) -> Optional[float]:
    """SeatGeek public API – free key from seatgeek.com/account/develop"""
    if not client_id or client_id.startswith("YOUR_"):
        return None
    try:
        teams = " ".join(game["teams"]) if game["teams"] else "FIFA World Cup"
        url = "https://api.seatgeek.com/2/events"
        params = {
            "q": f"FIFA World Cup 2026 {teams}",
            "venue.city": "Foxborough",
            "datetime_local.gte": f"{game['date']}T00:00:00",
            "datetime_local.lte": f"{game['date']}T23:59:59",
            "client_id": client_id,
            "client_secret": client_secret,
            "per_page": 5,
        }
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        prices = []
        for event in data.get("events", []):
            stats = event.get("stats", {})
            if stats.get("lowest_price"):
                prices.append(float(stats["lowest_price"]))
        if prices:
            logging.info(f"  SeatGeek [{game['label']}]: min=${min(prices):.0f}")
            return min(prices)
    except Exception as e:
        logging.warning(f"  SeatGeek error [{game['label']}]: {e}")
    return None


def fetch_stubhub(game: dict) -> Optional[float]:
    """StubHub – scrapes the search page for lowest listing price."""
    try:
        teams = "+".join(game["teams"]) if game["teams"] else "FIFA+World+Cup+2026"
        query = f"FIFA+World+Cup+2026+{teams}+Gillette+Stadium"
        url = f"https://www.stubhub.com/search?q={query}"
        resp = requests.get(url, headers=HEADERS, timeout=20)
        soup = BeautifulSoup(resp.text, "lxml")

        prices = []
        # StubHub injects event data as JSON in a script tag
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                ld = json.loads(script.string or "")
                if isinstance(ld, list):
                    ld = ld[0]
                offers = ld.get("offers", {})
                if isinstance(offers, dict) and offers.get("lowPrice"):
                    prices.append(float(offers["lowPrice"]))
            except Exception:
                pass

        # Fallback: look for price text patterns like "$123"
        if not prices:
            for el in soup.select("[data-testid*='price'], .price, .Price"):
                text = el.get_text(strip=True)
                match = re.search(r"\$(\d[\d,]+)", text)
                if match:
                    prices.append(float(match.group(1).replace(",", "")))

        if prices:
            low = min(prices)
            logging.info(f"  StubHub [{game['label']}]: min=${low:.0f}")
            return low
    except Exception as e:
        logging.warning(f"  StubHub error [{game['label']}]: {e}")
    return None


def fetch_tickpick(game: dict) -> Optional[float]:
    """TickPick – uses their internal search API (no fees shown = all-in price)."""
    try:
        teams = " ".join(game["teams"]) if game["teams"] else "FIFA World Cup 2026"
        url = "https://api.tickpick.com/1.0/search/auto_complete"
        params = {"q": f"World Cup 2026 {teams} Gillette"}
        resp = requests.get(url, headers=HEADERS, params=params, timeout=15)
        data = resp.json()

        event_id = None
        for item in data.get("items", []):
            name = item.get("name", "").lower()
            if "world cup" in name and game["date"][5:7] in item.get("date", ""):
                event_id = item.get("id")
                break

        if not event_id:
            return None

        listing_url = f"https://api.tickpick.com/1.0/listings/{event_id}?sort=p&offset=0&limit=10"
        resp2 = requests.get(listing_url, headers=HEADERS, timeout=15)
        listings = resp2.json()
        prices = [float(l["p"]) for l in listings.get("listings", []) if l.get("p")]
        if prices:
            logging.info(f"  TickPick [{game['label']}]: min=${min(prices):.0f}")
            return min(prices)
    except Exception as e:
        logging.warning(f"  TickPick error [{game['label']}]: {e}")
    return None


def fetch_vividseats(game: dict) -> Optional[float]:
    """Vivid Seats – scrapes search results page."""
    try:
        teams = "-".join(t.lower() for t in game["teams"]) if game["teams"] else "fifa-world-cup-2026"
        url = f"https://www.vividseats.com/search?searchTerm=FIFA+World+Cup+2026+Gillette+Stadium"
        resp = requests.get(url, headers=HEADERS, timeout=20)
        soup = BeautifulSoup(resp.text, "lxml")

        prices = []
        for script in soup.find_all("script"):
            text = script.string or ""
            if "lowestPrice" in text or "minPrice" in text:
                for match in re.finditer(r'"(?:lowestPrice|minPrice|price)"\s*:\s*([\d.]+)', text):
                    prices.append(float(match.group(1)))

        if not prices:
            for el in soup.select("[class*='price'], [data-testid*='price']"):
                text = el.get_text(strip=True)
                m = re.search(r"\$(\d[\d,]+)", text)
                if m:
                    prices.append(float(m.group(1).replace(",", "")))

        if prices:
            low = min(p for p in prices if p > 10)
            logging.info(f"  Vivid Seats [{game['label']}]: min=${low:.0f}")
            return low
    except Exception as e:
        logging.warning(f"  Vivid Seats error [{game['label']}]: {e}")
    return None


# ── Email ──────────────────────────────────────────────────────────────────────

def send_email(cfg: dict, alerts: list[dict]) -> None:
    ec = cfg["email"]
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"🎟️ World Cup Ticket Alert – {len(alerts)} deal(s) found!"
    msg["From"] = ec["sender_address"]
    msg["To"] = ec["recipient_address"]

    rows = ""
    for a in alerts:
        rows += (
            f"<tr>"
            f"<td style='padding:8px;border:1px solid #ddd'>{a['game']}</td>"
            f"<td style='padding:8px;border:1px solid #ddd'>{a['site']}</td>"
            f"<td style='padding:8px;border:1px solid #ddd;color:green;font-weight:bold'>${a['price']:.0f}</td>"
            f"<td style='padding:8px;border:1px solid #ddd;color:#888'>${a['threshold']:.0f}</td>"
            f"<td style='padding:8px;border:1px solid #ddd'>"
            f"<a href='{a['url']}'>Buy now</a></td>"
            f"</tr>"
        )

    html = f"""
    <html><body>
    <h2>⚽ FIFA World Cup 2026 – Boston Ticket Alert</h2>
    <p>Tickets below your price threshold were found at {datetime.now().strftime('%Y-%m-%d %H:%M')}:</p>
    <table style='border-collapse:collapse;width:100%'>
      <thead>
        <tr style='background:#1a6b2a;color:white'>
          <th style='padding:8px'>Game</th>
          <th style='padding:8px'>Site</th>
          <th style='padding:8px'>Lowest Price</th>
          <th style='padding:8px'>Your Threshold</th>
          <th style='padding:8px'>Link</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
    <p style='color:#666;font-size:12px;margin-top:20px'>
      Venue: Gillette Stadium, Foxborough MA<br>
      Prices may not include fees – verify on the site before purchasing.
    </p>
    </body></html>
    """

    plain = "\n".join(
        f"{a['game']} | {a['site']} | ${a['price']:.0f} (threshold: ${a['threshold']:.0f}) | {a['url']}"
        for a in alerts
    )

    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(ec["smtp_host"], ec["smtp_port"], context=context) as server:
        server.login(ec["sender_address"], ec["sender_app_password"])
        server.sendmail(ec["sender_address"], ec["recipient_address"], msg.as_string())
    logging.info(f"Email sent with {len(alerts)} alert(s) to {ec['recipient_address']}")


def site_url(site: str, game: dict) -> str:
    teams = "+".join(game["teams"]) if game["teams"] else "FIFA+World+Cup+2026"
    urls = {
        "Ticketmaster": f"https://www.ticketmaster.com/search?q=FIFA+World+Cup+2026+{teams}",
        "SeatGeek":     f"https://seatgeek.com/search?q=FIFA+World+Cup+2026+{teams}",
        "StubHub":      f"https://www.stubhub.com/search?q=FIFA+World+Cup+2026+{teams}+Gillette",
        "TickPick":     f"https://www.tickpick.com/search#q=World+Cup+2026+{teams}",
        "Vivid Seats":  f"https://www.vividseats.com/search?searchTerm=FIFA+World+Cup+2026+{teams}",
    }
    return urls.get(site, "https://google.com/search?q=World+Cup+2026+Boston+tickets")


# ── Main check loop ────────────────────────────────────────────────────────────

def run_check() -> None:
    cfg = load_config()
    notified = load_notified()
    thresholds = cfg["price_thresholds"]
    sites_cfg = cfg.get("sites", {})
    keys = cfg.get("api_keys", {})
    cooldown = cfg.get("cooldown_minutes", 120) * 60

    logging.info("=" * 60)
    logging.info(f"Running ticket check at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    alerts = []

    for game in BOSTON_GAMES:
        label = game["label"]
        threshold = thresholds.get(label, thresholds.get("default", 300))
        logging.info(f"Checking: {label} (threshold=${threshold})")

        results: dict[str, Optional[float]] = {}

        if sites_cfg.get("ticketmaster", True):
            results["Ticketmaster"] = fetch_ticketmaster(game, keys.get("ticketmaster", ""))

        if sites_cfg.get("seatgeek", True):
            results["SeatGeek"] = fetch_seatgeek(
                game,
                keys.get("seatgeek_client_id", ""),
                keys.get("seatgeek_client_secret", ""),
            )

        if sites_cfg.get("stubhub", True):
            results["StubHub"] = fetch_stubhub(game)

        if sites_cfg.get("tickpick", True):
            results["TickPick"] = fetch_tickpick(game)

        if sites_cfg.get("vivid_seats", True):
            results["Vivid Seats"] = fetch_vividseats(game)

        for site_name, price in results.items():
            if price is None:
                continue
            if price <= threshold:
                notif_key = f"{label}_{site_name}"
                last_notified = notified.get(notif_key, 0)
                if time.time() - last_notified > cooldown:
                    alerts.append({
                        "game": label,
                        "site": site_name,
                        "price": price,
                        "threshold": threshold,
                        "url": site_url(site_name, game),
                    })
                    notified[notif_key] = time.time()
                    logging.info(
                        f"  ALERT: {site_name} has {label} at ${price:.0f} "
                        f"(below threshold ${threshold})"
                    )
                else:
                    mins_ago = int((time.time() - last_notified) / 60)
                    logging.info(
                        f"  Skipping {site_name} alert for {label} "
                        f"(notified {mins_ago}m ago, cooldown={cooldown//60}m)"
                    )

    save_notified(notified)

    if alerts:
        try:
            send_email(cfg, alerts)
        except Exception as e:
            logging.error(f"Failed to send email: {e}")
    else:
        logging.info("No deals below threshold found.")

    logging.info("Check complete.")


def main() -> None:
    cfg = load_config()
    setup_logging(cfg.get("log_file", "ticket_watcher.log"))
    interval = cfg.get("check_interval_minutes", 60)

    logging.info(f"Ticket watcher started. Checking every {interval} minute(s).")
    run_check()  # run immediately on start

    schedule.every(interval).minutes.do(run_check)
    while True:
        schedule.run_pending()
        time.sleep(30)


if __name__ == "__main__":
    main()
