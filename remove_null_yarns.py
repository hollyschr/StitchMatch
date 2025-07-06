#!/usr/bin/env python3
"""
Remove yarn records with NULL yarn_id from Railway PostgreSQL
"""

import psycopg2
import os

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

def remove_null_yarns(postgres_conn):
    """Remove yarn records with NULL yarn_id"""
    try:
        cursor = postgres_conn.cursor()
        
        # First, check what we're about to delete
        cursor.execute('SELECT * FROM "YarnType" WHERE yarn_id IS NULL')
        null_yarns = cursor.fetchall()
        
        if not null_yarns:
            print("✅ No yarn records with NULL yarn_id found on Railway")
            return
        
        print(f"📋 Found {len(null_yarns)} yarn records with NULL yarn_id:")
        for yarn in null_yarns:
            print(f"   - {yarn}")
        
        # Delete the records
        cursor.execute('DELETE FROM "YarnType" WHERE yarn_id IS NULL')
        deleted_count = cursor.rowcount
        
        postgres_conn.commit()
        
        print(f"✅ Successfully deleted {deleted_count} yarn records with NULL yarn_id from Railway")
        
        # Verify deletion
        cursor.execute('SELECT COUNT(*) FROM "YarnType" WHERE yarn_id IS NULL')
        remaining_count = cursor.fetchone()[0]
        
        if remaining_count == 0:
            print("✅ Verification: No yarn records with NULL yarn_id remain on Railway")
        else:
            print(f"⚠️  Warning: {remaining_count} yarn records with NULL yarn_id still exist on Railway")
            
    except Exception as e:
        print(f"❌ Error removing null yarns: {e}")
        postgres_conn.rollback()

def main():
    """Main function"""
    print("🧶 Remove NULL Yarn Records from Railway")
    print("=" * 40)
    
    postgres_conn = get_railway_connection()
    if not postgres_conn:
        return
    
    try:
        remove_null_yarns(postgres_conn)
        print("\n🎉 Process completed successfully!")
        
    except Exception as e:
        print(f"❌ Process failed: {e}")
    finally:
        postgres_conn.close()

if __name__ == "__main__":
    main() 