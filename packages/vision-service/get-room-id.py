#!/usr/bin/env python3
"""
Quick script to get a room ID from the dashboard API
"""
import requests
import sys

DASHBOARD_URL = "http://localhost:3000"
API_KEY = "vision_service_key_12345"

try:
    # Try to get facility status (requires auth, but let's try)
    response = requests.get(
        f"{DASHBOARD_URL}/api/facility/rooms",
        headers={"x-api-key": API_KEY},
        timeout=5
    )
    
    if response.status_code == 200:
        rooms = response.json()
        if rooms and len(rooms) > 0:
            first_room = rooms[0]
            print("\n" + "="*60)
            print("ROOM FOUND!")
            print("="*60)
            print(f"Name: {first_room.get('name', 'Unknown')}")
            print(f"Type: {first_room.get('type', 'Unknown')}")
            print(f"Status: {first_room.get('status', 'Unknown')}")
            print(f"\nROOM ID: {first_room['id']}")
            print("="*60)
            print("\nUpdate your .env file:")
            print(f"ROOM_ID={first_room['id']}")
            print("="*60 + "\n")
            sys.exit(0)
    
    print(f"\nAPI returned status {response.status_code}")
    print(f"Response: {response.text}\n")
    print("The API requires authentication. Let me try the database directly...")
    
except Exception as e:
    print(f"\nError: {e}\n")
    print("Backend might not be running or API key auth not working.")

print("\nTrying database query instead...")
print("Run this in your backend terminal:")
print("\n  cd packages/backend")
print("  npx tsx -e \"import {pool} from './src/db/connection.js'; pool.query('SELECT id, name FROM rooms LIMIT 1').then(r => {console.log('Room ID:', r.rows[0].id); process.exit(0)})\"")
print()
