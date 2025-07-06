#!/usr/bin/env python3
"""
Add missing patterns to Railway PostgreSQL
This script identifies patterns that exist locally but not on Railway and adds them
"""

import sqlite3
import psycopg2
import os
import time
from datetime import datetime

# Railway PostgreSQL connection
RAILWAY_DB_URL = os.getenv('DATABASE_URL')

def get_railway_connection():
    """Get connection to Railway PostgreSQL"""
    try:
        if not RAILWAY_DB_URL:
            print("❌ DATABASE_URL environment variable not set")
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

def get_railway_pattern_ids(postgres_conn):
    """Get all pattern IDs that exist on Railway"""
    cursor = postgres_conn.cursor()
    cursor.execute('SELECT pattern_id FROM "Pattern"')
    railway_ids = {row[0] for row in cursor.fetchall()}
    print(f"📊 Found {len(railway_ids)} patterns on Railway")
    return railway_ids

def get_local_pattern_ids(sqlite_conn):
    """Get all pattern IDs from local database"""
    cursor = sqlite_conn.cursor()
    cursor.execute('SELECT pattern_id FROM Pattern')
    local_ids = {row[0] for row in cursor.fetchall()}
    print(f"📊 Found {len(local_ids)} patterns locally")
    return local_ids

def get_missing_pattern_ids(local_ids, railway_ids):
    """Find pattern IDs that exist locally but not on Railway"""
    missing_ids = local_ids - railway_ids
    print(f"📈 Found {len(missing_ids)} missing patterns to add")
    return missing_ids

def add_missing_patterns(sqlite_conn, postgres_conn, missing_ids):
    """Add missing patterns and their relationships to Railway"""
    
    if not missing_ids:
        print("✅ No missing patterns to add")
        return
    
    print(f"\n🚀 Adding {len(missing_ids)} missing patterns to Railway...")
    
    # Convert to list for easier handling
    missing_id_list = list(missing_ids)
    
    # Add patterns in batches
    batch_size = 100
    total_added = 0
    
    for i in range(0, len(missing_id_list), batch_size):
        batch_ids = missing_id_list[i:i + batch_size]
        print(f"\n📦 Processing batch {i//batch_size + 1}/{(len(missing_id_list) + batch_size - 1)//batch_size}")
        
        # Add patterns
        added_in_batch = add_patterns_batch(sqlite_conn, postgres_conn, batch_ids)
        total_added += added_in_batch
        
        print(f"   ✅ Added {added_in_batch} patterns in this batch")
    
    print(f"\n🎉 Successfully added {total_added} patterns to Railway!")

def add_patterns_batch(sqlite_conn, postgres_conn, pattern_ids):
    """Add a batch of patterns and their relationships"""
    
    if not pattern_ids:
        return 0
    
    # Convert pattern_ids to tuple for SQL IN clause
    pattern_ids_tuple = tuple(pattern_ids)
    
    try:
        # 1. Add the patterns themselves
        sqlite_cursor = sqlite_conn.cursor()
        postgres_cursor = postgres_conn.cursor()
        
        # Get pattern data
        placeholders = ','.join(['?' for _ in pattern_ids])
        sqlite_cursor.execute(f'SELECT * FROM Pattern WHERE pattern_id IN ({placeholders})', pattern_ids)
        patterns = sqlite_cursor.fetchall()
        
        if not patterns:
            return 0
        
        # Get column names
        sqlite_cursor.execute("PRAGMA table_info(Pattern)")
        columns = [col[1] for col in sqlite_cursor.fetchall()]
        
        # Insert patterns
        placeholders = ','.join(['%s' for _ in columns])
        column_names = ','.join([f'"{col}"' for col in columns])
        insert_query = f'INSERT INTO "Pattern" ({column_names}) VALUES ({placeholders})'
        
        postgres_cursor.executemany(insert_query, patterns)
        
        # 2. Add pattern relationships
        add_pattern_relationships(sqlite_conn, postgres_conn, pattern_ids_tuple)
        
        postgres_conn.commit()
        return len(patterns)
        
    except Exception as e:
        print(f"   ❌ Error adding batch: {e}")
        postgres_conn.rollback()
        return 0

def add_pattern_relationships(sqlite_conn, postgres_conn, pattern_ids_tuple):
    """Add relationship data for the patterns"""
    
    # Tables that reference patterns
    relationship_tables = [
        ('PatternRequiresTool', 'pattern_id'),
        ('PatternSuggestsYarn', 'pattern_id'),
        ('RequiresCraftType', 'pattern_id'),
        ('SuitableFor', 'pattern_id'),
        ('OwnsPattern', 'pattern_id'),
        ('FavoritePattern', 'pattern_id'),
        ('HasLink_Link', 'pattern_id'),
        ('SuggestedBySearch', 'pattern_id')
    ]
    
    for table_name, id_column in relationship_tables:
        try:
            sqlite_cursor = sqlite_conn.cursor()
            postgres_cursor = postgres_conn.cursor()
            
            # Get relationship data
            placeholders = ','.join(['?' for _ in pattern_ids_tuple])
            sqlite_cursor.execute(f'SELECT * FROM {table_name} WHERE {id_column} IN ({placeholders})', pattern_ids_tuple)
            relationships = sqlite_cursor.fetchall()
            
            if not relationships:
                continue
            
            # Get column names
            sqlite_cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [col[1] for col in sqlite_cursor.fetchall()]
            
            # Insert relationships
            placeholders = ','.join(['%s' for _ in columns])
            column_names = ','.join([f'"{col}"' for col in columns])
            insert_query = f'INSERT INTO "{table_name}" ({column_names}) VALUES ({placeholders})'
            
            postgres_cursor.executemany(insert_query, relationships)
            
        except Exception as e:
            print(f"   ⚠️  Error adding {table_name} relationships: {e}")
            # Continue with other tables even if one fails

def verify_addition(sqlite_conn, postgres_conn, missing_ids):
    """Verify that the patterns were added successfully"""
    print("\n🔍 Verifying addition...")
    
    try:
        postgres_cursor = postgres_conn.cursor()
        sqlite_cursor = sqlite_conn.cursor()
        
        # Check total patterns
        postgres_cursor.execute('SELECT COUNT(*) FROM "Pattern"')
        railway_total = postgres_cursor.fetchone()[0]
        
        sqlite_cursor.execute('SELECT COUNT(*) FROM Pattern')
        local_total = sqlite_cursor.fetchone()[0]
        
        print(f"   📊 Total patterns - Local: {local_total}, Railway: {railway_total}")
        
        # Check specific missing patterns
        missing_id_list = list(missing_ids)
        if missing_id_list:
            # Check first few missing patterns
            check_ids = missing_id_list[:5]
            placeholders = ','.join(['%s' for _ in check_ids])
            postgres_cursor.execute(f'SELECT COUNT(*) FROM "Pattern" WHERE pattern_id IN ({placeholders})', check_ids)
            found_count = postgres_cursor.fetchone()[0]
            
            print(f"   ✅ Found {found_count}/{len(check_ids)} checked patterns on Railway")
        
        # Check DROPS patterns specifically
        postgres_cursor.execute('SELECT COUNT(*) FROM "Pattern" WHERE designer = %s', ('DROPS design',))
        railway_drops = postgres_cursor.fetchone()[0]
        
        sqlite_cursor.execute('SELECT COUNT(*) FROM Pattern WHERE designer = ?', ('DROPS design',))
        local_drops = sqlite_cursor.fetchone()[0]
        
        print(f"   🧶 DROPS patterns - Local: {local_drops}, Railway: {railway_drops}")
        
    except Exception as e:
        print(f"   ❌ Error during verification: {e}")

def main():
    """Main function"""
    print("🚀 Add Missing Patterns to Railway")
    print("=" * 40)
    
    # Get connections
    sqlite_conn = get_local_connection()
    if not sqlite_conn:
        return
    
    postgres_conn = get_railway_connection()
    if not postgres_conn:
        sqlite_conn.close()
        return
    
    try:
        # Find missing patterns
        railway_ids = get_railway_pattern_ids(postgres_conn)
        local_ids = get_local_pattern_ids(sqlite_conn)
        missing_ids = get_missing_pattern_ids(local_ids, railway_ids)
        
        if not missing_ids:
            print("✅ All patterns are already on Railway!")
            return
        
        # Add missing patterns
        add_missing_patterns(sqlite_conn, postgres_conn, missing_ids)
        
        # Verify addition
        verify_addition(sqlite_conn, postgres_conn, missing_ids)
        
        print("\n🎉 Process completed successfully!")
        
    except Exception as e:
        print(f"❌ Process failed: {e}")
    finally:
        sqlite_conn.close()
        postgres_conn.close()

if __name__ == "__main__":
    main() 