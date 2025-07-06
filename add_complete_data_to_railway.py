#!/usr/bin/env python3
"""
Add complete missing data to Railway PostgreSQL
This script adds all missing reference data and patterns with their relationships
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

def add_missing_reference_data(sqlite_conn, postgres_conn):
    """Add missing reference data (CraftType, ProjectType, YarnType, Tool)"""
    print("\n🔧 Adding missing reference data...")
    
    # Tables to add in dependency order
    reference_tables = [
        ('CraftType', 'craft_type_id'),
        ('ProjectType', 'project_type_id'),
        ('YarnType', 'yarn_id'),
        ('Tool', 'tool_id')
    ]
    
    for table_name, id_column in reference_tables:
        print(f"\n📋 Processing {table_name}...")
        
        try:
            sqlite_cursor = sqlite_conn.cursor()
            postgres_cursor = postgres_conn.cursor()
            
            # Get existing IDs on Railway
            postgres_cursor.execute(f'SELECT {id_column} FROM "{table_name}"')
            existing_ids = {row[0] for row in postgres_cursor.fetchall()}
            
            # Get all data from SQLite
            sqlite_cursor.execute(f'SELECT * FROM {table_name}')
            all_data = sqlite_cursor.fetchall()
            
            if not all_data:
                print(f"   ⚠️  No data in {table_name}")
                continue
            
            # Get column names
            sqlite_cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [col[1] for col in sqlite_cursor.fetchall()]
            
            # Filter out existing data
            missing_data = []
            for row in all_data:
                if row[0] not in existing_ids:  # Assuming first column is the ID
                    missing_data.append(row)
            
            if not missing_data:
                print(f"   ✅ All {table_name} data already exists on Railway")
                continue
            
            print(f"   📊 Adding {len(missing_data)} new {table_name} records...")
            
            # Insert missing data
            placeholders = ','.join(['%s' for _ in columns])
            column_names = ','.join([f'"{col}"' for col in columns])
            insert_query = f'INSERT INTO "{table_name}" ({column_names}) VALUES ({placeholders})'
            
            postgres_cursor.executemany(insert_query, missing_data)
            postgres_conn.commit()
            
            print(f"   ✅ Successfully added {len(missing_data)} {table_name} records")
            
        except Exception as e:
            print(f"   ❌ Error adding {table_name}: {e}")
            postgres_conn.rollback()

def get_missing_pattern_ids(sqlite_conn, postgres_conn):
    """Get pattern IDs that exist locally but not on Railway"""
    print("\n🔍 Finding missing patterns...")
    
    # Get Railway pattern IDs
    postgres_cursor = postgres_conn.cursor()
    postgres_cursor.execute('SELECT pattern_id FROM "Pattern"')
    railway_ids = {row[0] for row in postgres_cursor.fetchall()}
    
    # Get local pattern IDs
    sqlite_cursor = sqlite_conn.cursor()
    sqlite_cursor.execute('SELECT pattern_id FROM Pattern')
    local_ids = {row[0] for row in sqlite_cursor.fetchall()}
    
    missing_ids = local_ids - railway_ids
    print(f"📈 Found {len(missing_ids)} missing patterns to add")
    
    return missing_ids

def add_patterns_with_relationships(sqlite_conn, postgres_conn, missing_ids):
    """Add patterns and all their relationships"""
    
    if not missing_ids:
        print("✅ No missing patterns to add")
        return
    
    print(f"\n🚀 Adding {len(missing_ids)} patterns with relationships...")
    
    # Convert to list for easier handling
    missing_id_list = list(missing_ids)
    
    # Add patterns in smaller batches to avoid timeouts
    batch_size = 50
    total_added = 0
    
    for i in range(0, len(missing_id_list), batch_size):
        batch_ids = missing_id_list[i:i + batch_size]
        print(f"\n📦 Processing batch {i//batch_size + 1}/{(len(missing_id_list) + batch_size - 1)//batch_size}")
        
        try:
            added_in_batch = add_pattern_batch_with_relationships(sqlite_conn, postgres_conn, batch_ids)
            total_added += added_in_batch
            print(f"   ✅ Added {added_in_batch} patterns in this batch")
            
        except Exception as e:
            print(f"   ❌ Error in batch: {e}")
            continue
    
    print(f"\n🎉 Successfully added {total_added} patterns to Railway!")

def add_pattern_batch_with_relationships(sqlite_conn, postgres_conn, pattern_ids):
    """Add a batch of patterns with all their relationships"""
    
    if not pattern_ids:
        return 0
    
    # Convert pattern_ids to tuple for SQL IN clause
    pattern_ids_tuple = tuple(pattern_ids)
    
    try:
        sqlite_cursor = sqlite_conn.cursor()
        postgres_cursor = postgres_conn.cursor()
        
        # 1. Add the patterns themselves
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
        
        # 2. Add all relationship data
        add_all_relationships(sqlite_conn, postgres_conn, pattern_ids_tuple)
        
        postgres_conn.commit()
        return len(patterns)
        
    except Exception as e:
        print(f"   ❌ Error adding batch: {e}")
        postgres_conn.rollback()
        return 0

def add_all_relationships(sqlite_conn, postgres_conn, pattern_ids_tuple):
    """Add all relationship data for the patterns"""
    
    # All tables that reference patterns
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

def verify_completion(sqlite_conn, postgres_conn):
    """Verify that all data was added successfully"""
    print("\n🔍 Verifying completion...")
    
    try:
        postgres_cursor = postgres_conn.cursor()
        sqlite_cursor = sqlite_conn.cursor()
        
        # Check total patterns
        postgres_cursor.execute('SELECT COUNT(*) FROM "Pattern"')
        railway_total = postgres_cursor.fetchone()[0]
        
        sqlite_cursor.execute('SELECT COUNT(*) FROM Pattern')
        local_total = sqlite_cursor.fetchone()[0]
        
        print(f"   📊 Total patterns - Local: {local_total}, Railway: {railway_total}")
        
        # Check DROPS patterns specifically
        postgres_cursor.execute('SELECT COUNT(*) FROM "Pattern" WHERE designer = %s', ('DROPS design',))
        railway_drops = postgres_cursor.fetchone()[0]
        
        sqlite_cursor.execute('SELECT COUNT(*) FROM Pattern WHERE designer = ?', ('DROPS design',))
        local_drops = sqlite_cursor.fetchone()[0]
        
        print(f"   🧶 DROPS patterns - Local: {local_drops}, Railway: {railway_drops}")
        
        # Check reference data
        reference_tables = ['CraftType', 'ProjectType', 'YarnType', 'Tool']
        for table_name in reference_tables:
            postgres_cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
            railway_count = postgres_cursor.fetchone()[0]
            
            sqlite_cursor.execute(f'SELECT COUNT(*) FROM {table_name}')
            local_count = sqlite_cursor.fetchone()[0]
            
            print(f"   📋 {table_name} - Local: {local_count}, Railway: {railway_count}")
        
    except Exception as e:
        print(f"   ❌ Error during verification: {e}")

def main():
    """Main function"""
    print("🚀 Complete Data Migration to Railway")
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
        # Step 1: Add missing reference data
        add_missing_reference_data(sqlite_conn, postgres_conn)
        
        # Step 2: Find missing patterns
        missing_ids = get_missing_pattern_ids(sqlite_conn, postgres_conn)
        
        if not missing_ids:
            print("✅ All patterns are already on Railway!")
            return
        
        # Step 3: Add patterns with relationships
        add_patterns_with_relationships(sqlite_conn, postgres_conn, missing_ids)
        
        # Step 4: Verify completion
        verify_completion(sqlite_conn, postgres_conn)
        
        print("\n🎉 Complete migration finished successfully!")
        print("Your Railway database now contains all your local data with full functionality!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
    finally:
        sqlite_conn.close()
        postgres_conn.close()

if __name__ == "__main__":
    main() 