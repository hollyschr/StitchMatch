#!/usr/bin/env python3
"""
Remove and reimport specific tables: SuitableFor, OwnsYarn, and PatternSuggestsYarn
"""

import os
import psycopg2
import csv
from urllib.parse import urlparse

# Railway database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/stitchmatch")

def get_railway_connection():
    """Get connection to Railway PostgreSQL database"""
    try:
        # Parse the DATABASE_URL
        url = urlparse(DATABASE_URL)
        
        conn = psycopg2.connect(
            host=url.hostname,
            port=url.port,
            database=url.path[1:],  # Remove leading slash
            user=url.username,
            password=url.password
        )
        print("✅ Connected to Railway database")
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to Railway: {e}")
        return None

def drop_specific_tables(conn):
    """Drop only the specific tables"""
    print("🗑️  Dropping specific tables...")
    
    tables_to_drop = [
        "SuitableFor",
        "OwnsYarn", 
        "PatternSuggestsYarn"
    ]
    
    cursor = conn.cursor()
    
    for table in tables_to_drop:
        try:
            cursor.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')
            print(f"✅ Dropped table: {table}")
        except Exception as e:
            print(f"❌ Failed to drop {table}: {e}")
    
    conn.commit()
    cursor.close()

def create_specific_tables(conn):
    """Create only the specific tables"""
    print("📋 Creating specific tables...")
    
    # Table creation SQL for the three tables
    table_sql = {
        "SuitableFor": """
            CREATE TABLE "SuitableFor" (
                pattern_id INTEGER,
                project_type_id INTEGER,
                PRIMARY KEY (pattern_id, project_type_id),
                FOREIGN KEY (pattern_id) REFERENCES "Pattern"(pattern_id),
                FOREIGN KEY (project_type_id) REFERENCES "ProjectType"(project_type_id)
            );
        """,
        
        "OwnsYarn": """
            CREATE TABLE "OwnsYarn" (
                user_id INTEGER,
                yarn_id VARCHAR(255),
                yardage INTEGER,
                grams INTEGER,
                PRIMARY KEY (user_id, yarn_id),
                FOREIGN KEY (user_id) REFERENCES "User"(user_id),
                FOREIGN KEY (yarn_id) REFERENCES "YarnType"(yarn_id)
            );
        """,
        
        "PatternSuggestsYarn": """
            CREATE TABLE "PatternSuggestsYarn" (
                pattern_id INTEGER,
                yarn_id VARCHAR(255),
                yardage_min INTEGER,
                yardage_max INTEGER,
                grams_min INTEGER,
                grams_max INTEGER,
                PRIMARY KEY (pattern_id, yarn_id),
                FOREIGN KEY (pattern_id) REFERENCES "Pattern"(pattern_id),
                FOREIGN KEY (yarn_id) REFERENCES "YarnType"(yarn_id)
            );
        """
    }
    
    cursor = conn.cursor()
    
    for table_name, sql in table_sql.items():
        try:
            cursor.execute(sql)
            print(f"✅ Created table: {table_name}")
        except Exception as e:
            print(f"❌ Failed to create {table_name}: {e}")
    
    conn.commit()
    cursor.close()

def import_csv_to_table(conn, csv_file, table_name):
    """Import a single CSV file to a specific table"""
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        return False
    
    cursor = conn.cursor()
    
    try:
        with open(csv_file, 'r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            if not reader.fieldnames:
                print(f"❌ No data in {csv_file}")
                return False
            
            # Build the INSERT statement
            columns = reader.fieldnames
            placeholders = ', '.join(['%s'] * len(columns))
            column_names = ', '.join([f'"{col}"' for col in columns])
            insert_sql = f'INSERT INTO "{table_name}" ({column_names}) VALUES ({placeholders})'
            
            # Insert data
            row_count = 0
            for row in reader:
                # Handle empty strings for numeric fields
                values = []
                for col in columns:
                    value = row[col]
                    if value == '':
                        values.append(None)  # NULL for empty strings
                    else:
                        values.append(value)
                
                cursor.execute(insert_sql, values)
                row_count += 1
                
                # Commit every 1000 rows
                if row_count % 1000 == 0:
                    conn.commit()
                    print(f"   📊 Imported {row_count} rows...")
            
            conn.commit()
            print(f"✅ Successfully imported {row_count} rows into {table_name}")
            return True
            
    except Exception as e:
        print(f"❌ Error importing {csv_file}: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()

def main():
    """Main function to remove and reimport specific tables"""
    print("🔄 StitchMatch Specific Table Reimport")
    print("=" * 50)
    
    # Connect to Railway
    print("🔌 Connecting to Railway database...")
    conn = get_railway_connection()
    if not conn:
        return
    
    try:
        # Define the tables to reimport
        tables_to_reimport = [
            ('SuitableFor.csv', 'SuitableFor'),
            ('OwnsYarn.csv', 'OwnsYarn'),
            ('PatternSuggestsYarn.csv', 'PatternSuggestsYarn')
        ]
        
        # Step 1: Drop the specific tables
        drop_specific_tables(conn)
        
        # Step 2: Create the specific tables
        create_specific_tables(conn)
        
        # Step 3: Import the CSV files
        print("\n📥 Importing CSV files...")
        successful_imports = 0
        failed_imports = 0
        
        for csv_file, table_name in tables_to_reimport:
            print(f"\n📥 Importing {csv_file} into {table_name}...")
            if import_csv_to_table(conn, csv_file, table_name):
                successful_imports += 1
            else:
                failed_imports += 1
        
        print(f"\n🎉 Reimport completed!")
        print(f"✅ Successful imports: {successful_imports}")
        print(f"❌ Failed imports: {failed_imports}")
        
    finally:
        conn.close()

if __name__ == "__main__":
    main() 