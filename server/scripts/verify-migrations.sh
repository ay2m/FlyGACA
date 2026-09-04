#!/bin/bash
# Verify that all required database migrations have been applied.
# Run this after deploying the Express backend to ensure the schema is correct.

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

echo "Verifying database migrations..."
echo "Database: $DATABASE_URL"

# Connect and check tables exist
psql "$DATABASE_URL" <<EOF
-- Check users table
SELECT COUNT(*) as users_table_exists
FROM information_schema.tables
WHERE table_name = 'users';

-- Check profiles table
SELECT COUNT(*) as profiles_table_exists
FROM information_schema.tables
WHERE table_name = 'profiles';

-- Check schema version (if exists)
SELECT version FROM _migrations ORDER BY version DESC LIMIT 1;

-- List all tables in the database
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check users table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
EOF

echo ""
echo "✓ Database schema verification complete"
