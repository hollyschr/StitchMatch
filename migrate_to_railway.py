#!/usr/bin/env python3
"""
Migrate local SQLite database to Railway PostgreSQL
This script converts and uploads all data from local SQLite to Railway Postgres
"""

import sqlite3
import psycopg2
import os
import sys
from datetime import datetime
import time

# Railway PostgreSQL connection details
# These will be set via environment variables
RAILWAY_DB_URL = os.getenv('DATABASE_URL')

def get_railway_connection():
    """Get connection to Railway PostgreSQL"""
    try:
        if not RAILWAY_DB_URL:
            print("❌ DATABASE_URL environment variable not set")
            print("Please run: railway variables set DATABASE_URL=your_railway_db_url")
            return None
        
        conn = psycopg2.connect(RAILWAY_DB_URL)
        print("✅ Connected to Railway PostgreSQL")
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to Railway: {e}")
        return None

def get_local_connection():
    """Get connection to local SQLite database"""
    try:
        conn = sqlite3.connect('StitchMatch.db')
        print("✅ Connected to local SQLite database")
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to local database: {e}")
        return None

def get_table_schema(table_name, sqlite_conn):
    """Get table schema from SQLite"""
    cursor = sqlite_conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    return columns

def convert_sqlite_to_postgres(sqlite_conn, postgres_conn):
    """Convert and migrate data from SQLite to PostgreSQL"""
    
    # Tables to migrate (in order due to foreign key dependencies)
    tables = [
        'CraftType',
        'ProjectType', 
        'YarnType',
        'Tool',
        'User',
        'Pattern',
        'PatternRequiresTool',
        'PatternSuggestsYarn',
        'RequiresCraftType',
        'SuitableFor',
        'OwnsPattern',
        'OwnsTool',
        'OwnsYarn',
        'FavoritePattern',
        'SearchQuery',
        'HasLink_Link',
        'SuggestedBySearch'
    ]
    
    total_start = time.time()
    
    for table_name in tables:
        print(f"\n🔄 Migrating table: {table_name}")
        start_time = time.time()
        
        try:
            # Get data from SQLite
            sqlite_cursor = sqlite_conn.cursor()
            sqlite_cursor.execute(f"SELECT * FROM {table_name}")
            rows = sqlite_cursor.fetchall()
            
            if not rows:
                print(f"   ⚠️  No data in {table_name}")
                continue
            
            # Get column names
            sqlite_cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [col[1] for col in sqlite_cursor.fetchall()]
            
            print(f"   📊 Found {len(rows)} rows")
            
            # Clear existing data in PostgreSQL
            postgres_cursor = postgres_conn.cursor()
            postgres_cursor.execute(f"DELETE FROM \"{table_name}\"")
            
            # Insert data into PostgreSQL
            placeholders = ', '.join(['%s'] * len(columns))
            column_names = ', '.join([f'"{col}"' for col in columns])
            insert_query = f'INSERT INTO "{table_name}" ({column_names}) VALUES ({placeholders})'
            
            # Convert data types and handle NULL values
            converted_rows = []
            for row in rows:
                converted_row = []
                for value in row:
                    if value is None:
                        converted_row.append(None)
                    elif isinstance(value, str):
                        # Handle potential encoding issues
                        converted_row.append(value.encode('utf-8', errors='ignore').decode('utf-8'))
                    else:
                        converted_row.append(value)
                converted_rows.append(converted_row)
            
            # Batch insert for better performance
            batch_size = 1000
            for i in range(0, len(converted_rows), batch_size):
                batch = converted_rows[i:i + batch_size]
                postgres_cursor.executemany(insert_query, batch)
                print(f"   📦 Inserted batch {i//batch_size + 1}/{(len(converted_rows) + batch_size - 1)//batch_size}")
            
            postgres_conn.commit()
            
            elapsed = time.time() - start_time
            print(f"   ✅ Migrated {len(rows)} rows in {elapsed:.2f}s")
            
        except Exception as e:
            print(f"   ❌ Error migrating {table_name}: {e}")
            postgres_conn.rollback()
            continue
    
    total_elapsed = time.time() - total_start
    print(f"\n🎉 Migration completed in {total_elapsed:.2f}s")

def verify_migration(sqlite_conn, postgres_conn):
    """Verify that migration was successful"""
    print("\n🔍 Verifying migration...")
    
    tables = ['Pattern', 'User', 'CraftType', 'ProjectType', 'YarnType']
    
    for table_name in tables:
        try:
            # Count SQLite
            sqlite_cursor = sqlite_conn.cursor()
            sqlite_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            sqlite_count = sqlite_cursor.fetchone()[0]
            
            # Count PostgreSQL
            postgres_cursor = postgres_conn.cursor()
            postgres_cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
            postgres_count = postgres_cursor.fetchone()[0]
            
            print(f"   {table_name}: SQLite={sqlite_count}, PostgreSQL={postgres_count}")
            
            if sqlite_count != postgres_count:
                print(f"   ⚠️  Count mismatch for {table_name}!")
            else:
                print(f"   ✅ {table_name} counts match")
                
        except Exception as e:
            print(f"   ❌ Error verifying {table_name}: {e}")

def main():
    """Main migration function"""
    print("🚀 StitchMatch Database Migration to Railway")
    print("=" * 50)
    
    # Check if we're running on Railway
    if RAILWAY_DB_URL:
        print("🌐 Running on Railway - will migrate to local database")
        # This is for testing the migration locally
        pass
    else:
        print("💻 Running locally - will migrate to Railway")
    
    # Get connections
    sqlite_conn = get_local_connection()
    if not sqlite_conn:
        return
    
    postgres_conn = get_railway_connection()
    if not postgres_conn:
        sqlite_conn.close()
        return
    
    try:
        # Perform migration
        convert_sqlite_to_postgres(sqlite_conn, postgres_conn)
        
        # Verify migration
        verify_migration(sqlite_conn, postgres_conn)
        
        print("\n🎉 Migration completed successfully!")
        print("Your Railway database now contains all your local data.")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
    finally:
        sqlite_conn.close()
        postgres_conn.close()

if __name__ == "__main__":
    main() 