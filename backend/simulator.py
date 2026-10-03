"""
Simulates the LoRa gateway until the real hardware is wired in.
Posts fake readings to the same endpoint the ESP32 gateway will
call later, so switching to real hardware needs zero backend
code changes — just stop this script and point the gateway here.
"""

import random
import time

import requests

API_URL = "http://localhost:8000/api/readings"
NODES = ["NODE-1", "NODE-2", "NODE-3"]

levels = {n: random.uniform(20, 40) for n in NODES}
blockage_node = "NODE-2"
blockage_started = False
tick = 0


def step_level(node):
    global blockage_started
    if node == blockage_node and tick > 20:
        blockage_started = True

    if blockage_started and node == blockage_node:
        levels[node] = max(82, min(97, levels[node] + random.uniform(-1, 1)))
    else:
        levels[node] += random.uniform(-3, 6)
        levels[node] = max(5, min(99, levels[node]))
    return round(levels[node], 1)


def rainfall_for(node):
    if blockage_started and node == blockage_node:
        return 0.0
    return round(random.uniform(0, 8), 1)


print("Simulator running. Ctrl+C to stop.")
while True:
    tick += 1
    for node in NODES:
        payload = {
            "node_id": node,
            "water_level_pct": step_level(node),
            "rainfall_mm": rainfall_for(node),
            "battery_pct": round(random.uniform(70, 100), 1),
        }
        try:
            response = requests.post(API_URL, json=payload, timeout=3)
            print(node, payload["water_level_pct"], "->", response.json().get("status"))
        except requests.RequestException as exc:
            print("POST failed:", exc)
    time.sleep(5)
