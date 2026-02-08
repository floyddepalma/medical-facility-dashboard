#!/bin/bash

echo "=========================================="
echo "Getting Room ID from Database"
echo "=========================================="
echo ""

cd ../backend

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: backend/.env not found"
    exit 1
fi

# Extract DATABASE_URL
DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2-)

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not found in backend/.env"
    exit 1
fi

echo "Fetching rooms from database..."
echo ""

# Query database for rooms
psql "$DATABASE_URL" -c "SELECT id, name, type, status FROM rooms ORDER BY name LIMIT 5;" 2>/dev/null

if [ $? -ne 0 ]; then
    echo ""
    echo "Note: psql command not found or connection failed"
    echo ""
    echo "Alternative: Check your database directly or use the seed output"
    echo "After running 'npm run db:seed', look for room IDs in the output"
fi

echo ""
echo "Copy one of the room IDs above and update vision-service/.env"
echo "Example: ROOM_ID=550e8400-e29b-41d4-a716-446655440000"
echo ""
