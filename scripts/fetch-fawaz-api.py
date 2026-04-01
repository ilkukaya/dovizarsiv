#!/usr/bin/env python3
import requests, json
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "src" / "data"
COINS = {"btc":"btc-try","eth":"eth-try","sol":"sol-try","xrp":"xrp-try","doge":"doge-try","bnb":"bnb-try"}

def main():
    for url in ["https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/try.min.json",
                 "https://latest.currency-api.pages.dev/v1/currencies/try.min.json"]:
        try:
            r = requests.get(url, timeout=15); r.raise_for_status()
            data = r.json(); break
        except: continue
    else:
        print("API erişilemedi"); return
    date_iso = data.get("date", datetime.now().strftime("%Y-%m-%d"))
    rates = data.get("try", {})
    for coin, slug in COINS.items():
        if coin in rates and rates[coin] > 0:
            price = round(1 / rates[coin], 2)
            fp = DATA_DIR / "crypto" / f"{slug}.json"
            fp.parent.mkdir(parents=True, exist_ok=True)
            existing = json.loads(fp.read_text()) if fp.exists() else {}
            existing[date_iso] = {"price": price}
            fp.write_text(json.dumps(dict(sorted(existing.items())), separators=(",",":")))
            print(f"OK {coin.upper()}/TRY: {price:,.0f}")

if __name__=="__main__": main()
