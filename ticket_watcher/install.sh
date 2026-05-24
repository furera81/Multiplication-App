#!/usr/bin/env bash
# Sets up the ticket watcher: installs deps and registers a cron job.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECKER="$SCRIPT_DIR/checker.py"
PYTHON=$(which python3)
LOGFILE="$SCRIPT_DIR/cron_install.log"

echo "Installing Python dependencies..."
pip3 install -r "$SCRIPT_DIR/requirements.txt" --quiet
playwright install chromium 2>/dev/null || true

echo ""
echo "Choose how to run the watcher:"
echo "  1) Built-in scheduler (script runs continuously, recommended for cloud/VPS)"
echo "  2) Cron job (recommended for Mac/Linux desktop)"
read -rp "Enter 1 or 2 [default: 1]: " choice
choice="${choice:-1}"

if [[ "$choice" == "2" ]]; then
    CRON_LINE="0 * * * * $PYTHON $CHECKER >> $SCRIPT_DIR/cron.log 2>&1"
    (crontab -l 2>/dev/null | grep -v "checker.py"; echo "$CRON_LINE") | crontab -
    echo ""
    echo "Cron job registered. It will run at the top of every hour."
    echo "To verify: crontab -l"
    echo "To remove: crontab -e  (delete the checker.py line)"
else
    echo ""
    echo "Run the watcher manually with:"
    echo "  python3 $CHECKER"
    echo ""
    echo "For a persistent background process (Linux/Mac):"
    echo "  nohup python3 $CHECKER > $SCRIPT_DIR/watcher.log 2>&1 &"
fi

echo ""
echo "IMPORTANT – edit config.json before running:"
echo "  $SCRIPT_DIR/config.json"
echo ""
echo "Required fields:"
echo "  email.sender_address       – your Gmail address"
echo "  email.sender_app_password  – Gmail App Password (not your login password!)"
echo "  email.recipient_address    – where alerts are sent (already set to furertrauma@gmail.com)"
echo ""
echo "Optional (for better price data – both are free):"
echo "  api_keys.ticketmaster       – get at: developer.ticketmaster.com"
echo "  api_keys.seatgeek_client_id – get at: seatgeek.com/account/develop"
echo ""
echo "Adjust price_thresholds in config.json per game to your liking."
