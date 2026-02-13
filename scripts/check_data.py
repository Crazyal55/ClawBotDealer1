#!/usr/bin/env python3

import sys, json

data = json.load(sys.stdin)

vehicles_with_price = [c for c in data if c.get('price')]
prices = [c['price'] for c in vehicles_with_price]
qualities = [c.get('quality_score', 0) for c in data]

print(f"Total vehicles: {len(data)}")
print(f"Vehicles with price: {len(vehicles_with_price)}")
if prices:
    print(f"Price range: ${min(prices):.0f} - ${max(prices):.0f}")
    print(f"Avg price: ${sum(prices)/len(prices):.0f}")
if qualities:
    print(f"Avg quality: {sum(qualities)/len(qualities):.0f}")

# Count by location
locations = {}
for c in data:
    loc = c.get('location_id', 0)
    locations[loc] = locations.get(loc, 0) + 1

print(f"\nBy location:")
for loc, count in sorted(locations.items()):
    print(f"  Location {loc}: {count} vehicles")
