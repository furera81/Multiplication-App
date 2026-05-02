#!/usr/bin/env python3
"""
Ticket Price Tracker — checks prices every hour and alerts on changes or deals.

Setup:
  pip install requests schedule

Get a FREE Ticketmaster API key (takes 2 minutes):
  1. Go to https://developer.ticketmaster.com/products-and-docs/apis/getting-started/
  2. Sign up and create an app
  3. Copy your Consumer Key and paste it below as TICKETMASTER_API_KEY

Usage:
  python3 ticket_tracker.py
"""

import json
import os
import time
import datetime
import requests
import schedule

# ──────────────────────────────────────────────
#  CONFIG — edit this section
# ──────────────────────────────────────────────

# Get your free key at https://developer.ticketmaster.com
TICKETMASTER_API_KEY = "YOUR_API_KEY_HERE"

WATCHLIST = [
    {
        "name": "Lakers vs Warriors",       # label shown in alerts
        "keyword": "Lakers Warriors",        # search keyword
        "max_price": 150,                    # alert if lowest price drops below this
    },
    {
        "name": "Yankees vs Red Sox",
        "keyword": "Yankees Red Sox",
        "max_price": 80,
    },
    # Add more games:
    # {"name": "...", "keyword": "...", "max_price": 100},
]

CHECK_INTERVAL_MINUTES = 60
PRICE_HISTORY_FILE = "ticket_prices.json"
# ──────────────────────────────────────────────


def fetch_events(keyword: str) -> list[dict]:
    """Search Ticketmaster for upcoming events matching keyword."""
    params = {
        "apikey": TICKETMASTER_API_KEY,
        "keyword": keyword,
        "classificationName": "sports",
        "size": 5,
        "sort": "date,asc",
    }
    try:
        resp = requests.get(
            "https://app.ticketmaster.com/discovery/v2/events.json",
            params=params,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("_embedded", {}).get("events", [])
    except requests.RequestException as e:
        print(f"  [error] API request failed: {e}")
        return []


def get_price_range(event: dict) -> tuple[float | None, float | None]:
    """Return (min_price, max_price) from an event, or (None, None)."""
    for price_info in event.get("priceRanges", []):
        return price_info.get("min"), price_info.get("max")
    return None, None


def load_history() -> dict:
    if os.path.exists(PRICE_HISTORY_FILE):
        with open(PRICE_HISTORY_FILE) as f:
            return json.load(f)
    return {}


def save_history(history: dict):
    with open(PRICE_HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)


def desktop_notify(title: str, message: str):
    """Best-effort desktop notification. Falls back silently."""
    import subprocess
    try:
        subprocess.run(["notify-send", title, message], check=False, capture_output=True)
        return
    except FileNotFoundError:
        pass
    try:
        script = f'display notification "{message}" with title "{title}"'
        subprocess.run(["osascript", "-e", script], check=False, capture_output=True)
    except FileNotFoundError:
        pass


def check_all():
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    print(f"\n{'='*60}")
    print(f"  Ticket Price Check — {now}")
    print(f"{'='*60}")

    if TICKETMASTER_API_KEY == "YOUR_API_KEY_HERE":
        print("\n  ⚠ No API key set. Get a free key at:")
        print("    https://developer.ticketmaster.com")
        print("  Then paste it into TICKETMASTER_API_KEY in this script.")
        return

    history = load_history()

    for item in WATCHLIST:
        name = item["name"]
        keyword = item["keyword"]
        max_price = item["max_price"]

        print(f"\n  Watching: {name}")
        events = fetch_events(keyword)

        if not events:
            print("    No upcoming events found.")
            continue

        for event in events:
            event_id = event.get("id", "")
            event_name = event.get("name", "Unknown")
            event_date = (
                event.get("dates", {})
                    .get("start", {})
                    .get("localDate", "TBD")
            )
            venue = (
                event.get("_embedded", {})
                    .get("venues", [{}])[0]
                    .get("name", "")
            )
            url = event.get("url", "")
            min_price, max_price_listed = get_price_range(event)

            prev = history.get(event_id, {})
            prev_price = prev.get("min_price")

            history[event_id] = {
                "name": event_name,
                "date": event_date,
                "min_price": min_price,
            }

            # Build display line
            if min_price is None:
                price_str = "price not listed"
            else:
                price_str = f"${min_price:.0f}"
                if max_price_listed:
                    price_str += f" – ${max_price_listed:.0f}"

            if prev_price is None:
                change = "(first check)"
            elif min_price is not None and min_price < prev_price:
                change = f"↓ was ${prev_price:.0f}"
            elif min_price is not None and min_price > prev_price:
                change = f"↑ was ${prev_price:.0f}"
            else:
                change = "(no change)"

            deal_flag = ""
            if min_price is not None and min_price <= max_price:
                deal_flag = "  ★ DEAL"

            print(f"    • {event_date}  {event_name}")
            print(f"      Venue : {venue}")
            print(f"      Price : {price_str}  {change}{deal_flag}")
            if url:
                print(f"      Link  : {url}")

            # Desktop alert: price below threshold
            if min_price is not None and min_price <= max_price:
                desktop_notify(
                    f"Ticket Deal: {name}",
                    f"{event_name} on {event_date} — from ${min_price:.0f}",
                )

            # Desktop alert: significant price drop (>10%)
            if prev_price and min_price is not None and min_price < prev_price * 0.9:
                drop_pct = int((1 - min_price / prev_price) * 100)
                print(f"      ⚠  Price dropped {drop_pct}%!")
                desktop_notify(
                    f"Price Drop: {name}",
                    f"Down {drop_pct}%! {event_name} on {event_date} — now ${min_price:.0f}",
                )

    save_history(history)
    print(f"\n  Next check in {CHECK_INTERVAL_MINUTES} minutes.\n")


def main():
    print("Ticket Price Tracker")
    print(f"Watching {len(WATCHLIST)} game(s) every {CHECK_INTERVAL_MINUTES} minutes.")
    print("Press Ctrl+C to stop.\n")

    check_all()

    schedule.every(CHECK_INTERVAL_MINUTES).minutes.do(check_all)

    while True:
        schedule.run_pending()
        time.sleep(30)


if __name__ == "__main__":
    main()
