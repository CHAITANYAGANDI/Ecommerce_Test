"""
Seeds the Walmart products collection from the public DummyJSON API.

Usage:
    python seed.py                    # add new products, skip duplicates
    python seed.py --clear            # delete all products first
    python seed.py --count=50         # how many to fetch (max 100)
    python seed.py --skip=50          # offset (default 50 so we don't overlap with Amazon's seed)

Reads MONGO_CONN from .env.
Requires: requests, mongoengine, python-dotenv.
"""

import os
import sys
from datetime import datetime
import requests
from dotenv import load_dotenv
from mongoengine import connect, NotUniqueError

from Models.product_model import Product

load_dotenv()


def parse_arg(args, name, default):
    for a in args:
        if a.startswith(f"--{name}="):
            return a.split("=", 1)[1]
    return default


def transform(p):
    brand = p.get("brand") or "Generic"
    return Product(
        name=p["title"],
        description=p["description"],
        price=p["price"],
        category=p["category"],
        brand=brand,
        features=[
            f"Brand: {brand}",
            f"Rating: {p.get('rating', 0)}/5",
            f"Stock: {p.get('stock', 0)} units",
        ],
        sold_by="Walmart",
        image_url=p.get("thumbnail")
        or (p.get("images") and p["images"][0])
        or "",
        inventory=[
            {
                "stock": p.get("stock", 0),
                "supplier": brand,
                "last_updated": datetime.utcnow(),
            }
        ],
        is_active=True,
        in_stock=p.get("stock", 0) > 0,
    )


def main():
    args = sys.argv[1:]
    clear = "--clear" in args
    count = int(parse_arg(args, "count", "50"))
    skip = int(parse_arg(args, "skip", "50"))

    if not os.getenv("MONGO_CONN"):
        print("MONGO_CONN not set in .env")
        sys.exit(1)

    connect(host=os.getenv("MONGO_CONN"))
    print("[seed] Connected to MongoDB")

    if clear:
        deleted = Product.objects.delete()
        print(f"[seed] Cleared {deleted} existing products")

    url = f"https://dummyjson.com/products?limit={count}&skip={skip}"
    print(f"[seed] Fetching {url}")
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    products = resp.json().get("products", [])
    print(f"[seed] Got {len(products)} products")

    inserted = 0
    skipped = 0
    for p in products:
        try:
            doc = transform(p)
            if not doc.name or not doc.image_url:
                skipped += 1
                continue
            doc.save()
            inserted += 1
        except NotUniqueError:
            skipped += 1
        except Exception as e:
            print(f"[seed] Skipped '{p.get('title')}': {e}")
            skipped += 1

    print(f"[seed] Inserted {inserted} new, {skipped} duplicates/errors skipped")
    print("[seed] Done")


if __name__ == "__main__":
    main()
