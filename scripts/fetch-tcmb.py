#!/usr/bin/env python3
import xml.etree.ElementTree as ET
import requests, json, sys, os
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "src" / "data"

CURRENCIES = {
    "USD":"usd-try","EUR":"eur-try","GBP":"gbp-try","CHF":"chf-try",
    "JPY":"jpy-try","SAR":"sar-try","CAD":"cad-try","AUD":"aud-try",
    "CNY":"cny-try","NOK":"nok-try","SEK":"sek-try","DKK":"dkk-try",
    "RON":"ron-try","RUB":"rub-try","KRW":"krw-try","AZN":"azn-try",
    "AED":"aed-try","KWD":"kwd-try","QAR":"qar-try","PKR":"pkr-try","KZT":"kzt-try"
}

def fetch_day(date=None):
    if date is None:
        url = "https://www.tcmb.gov.tr/kurlar/today.xml"
    else:
        url = f"https://www.tcmb.gov.tr/kurlar/{date.strftime('%Y%m')}/{date.strftime('%d%m%Y')}.xml"
    r = requests.get(url, timeout=15)
    if r.status_code == 404:
        return None
    r.raise_for_status()
    root = ET.fromstring(r.content)
    tarih = root.attrib.get("Tarih","")
    date_iso = datetime.strptime(tarih, "%d.%m.%Y").strftime("%Y-%m-%d") if tarih else datetime.now().strftime("%Y-%m-%d")
    result = {}
    for c in root.findall("Currency"):
        code = c.attrib.get("Kod","")
        unit = int(c.find("Unit").text) if c.find("Unit") is not None and c.find("Unit").text else 1
        fb = c.find("ForexBuying")
        fs = c.find("ForexSelling")
        buy = float(fb.text) if fb is not None and fb.text else None
        sell = float(fs.text) if fs is not None and fs.text else None
        if buy and sell:
            if unit > 1:
                buy = round(buy / unit, 6)
                sell = round(sell / unit, 6)
            result[code] = {"buy": buy, "sell": sell}
    return date_iso, result

def save(slug, date_iso, record):
    fp = DATA_DIR / "tcmb" / f"{slug}.json"
    fp.parent.mkdir(parents=True, exist_ok=True)
    data = json.loads(fp.read_text()) if fp.exists() else {}
    data[date_iso] = record
    fp.write_text(json.dumps(dict(sorted(data.items())), separators=(",",":")))

def main():
    days = int(sys.argv[1]) if len(sys.argv)>1 else 5
    for i in range(days):
        d = datetime.now() - timedelta(days=i)
        if d.weekday() >= 5: continue
        try:
            res = fetch_day(d)
            if not res: continue
            date_iso, rates = res
            for code, slug in CURRENCIES.items():
                if code in rates:
                    save(slug, date_iso, rates[code])
            print(f"OK {date_iso}: {len(rates)} kur")
        except Exception as e:
            print(f"HATA {d.strftime('%Y-%m-%d')}: {e}")
    (DATA_DIR/"meta.json").write_text(json.dumps({"lastUpdated":datetime.utcnow().isoformat()+"Z"}))

if __name__=="__main__": main()
