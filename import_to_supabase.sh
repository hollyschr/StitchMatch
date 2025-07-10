#!/bin/bash
# Script to import converted SQL into Supabase
# Usage: ./import_to_supabase.sh

echo "🚀 Importing data into Supabase..."

# Set your Supabase connection details
SUPABASE_URL="your_supabase_url"
SUPABASE_PASSWORD="your_supabase_password"

# Import the converted SQL
psql "postgresql://postgres:$SUPABASE_PASSWORD@db.$SUPABASE_URL:5432/postgres" -f SMdata_postgres.sql

echo "✅ Import completed!"
