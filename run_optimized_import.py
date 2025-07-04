#!/usr/bin/env python3
"""
Script to run the optimized Ravelry pattern import.
This will only import patterns that aren't already in the database.
"""

import sqlite3
import subprocess
import sys
from datetime import datetime

def get_db_stats(db_path):
    """Get current database statistics."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # Get pattern count
    cur.execute("SELECT COUNT(*) FROM Pattern")
    pattern_count = cur.fetchone()[0]
    
    # Get highest pattern ID
    cur.execute("SELECT MAX(pattern_id) FROM Pattern")
    max_id = cur.fetchone()[0] or 0
    
    # Get pattern count by craft type
    cur.execute("""
        SELECT ct.name, COUNT(*) 
        FROM Pattern p 
        JOIN RequiresCraftType rct ON p.pattern_id = rct.pattern_id 
        JOIN CraftType ct ON rct.craft_type_id = ct.craft_type_id 
        GROUP BY ct.name
    """)
    craft_counts = dict(cur.fetchall())
    
    conn.close()
    
    return {
        'total_patterns': pattern_count,
        'max_pattern_id': max_id,
        'craft_counts': craft_counts
    }

def main():
    DB_PATH = 'StitchMatch.db'
    
    print("=" * 60)
    print("STITCHMATCH OPTIMIZED PATTERN IMPORT")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Check database before import
    print("BEFORE IMPORT:")
    try:
        stats_before = get_db_stats(DB_PATH)
        print(f"  Total patterns: {stats_before['total_patterns']}")
        print(f"  Highest pattern ID: {stats_before['max_pattern_id']}")
        print("  By craft type:")
        for craft, count in stats_before['craft_counts'].items():
            print(f"    {craft}: {count}")
    except Exception as e:
        print(f"  Error reading database: {e}")
        return
    
    print()
    print("Starting optimized import...")
    print("-" * 60)
    
    # Run the optimized import
    try:
        result = subprocess.run([sys.executable, 'crochet_importer_optimized.py'], 
                              capture_output=True, text=True, cwd='.')
        
        print("IMPORT OUTPUT:")
        print(result.stdout)
        
        if result.stderr:
            print("ERRORS:")
            print(result.stderr)
            
    except Exception as e:
        print(f"Error running import: {e}")
        return
    
    print("-" * 60)
    
    # Check database after import
    print("AFTER IMPORT:")
    try:
        stats_after = get_db_stats(DB_PATH)
        print(f"  Total patterns: {stats_after['total_patterns']}")
        print(f"  Highest pattern ID: {stats_after['max_pattern_id']}")
        print("  By craft type:")
        for craft, count in stats_after['craft_counts'].items():
            print(f"    {craft}: {count}")
        
        # Calculate differences
        new_patterns = stats_after['total_patterns'] - stats_before['total_patterns']
        print()
        print(f"NEW PATTERNS ADDED: {new_patterns}")
        
    except Exception as e:
        print(f"  Error reading database: {e}")
    
    print()
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

if __name__ == '__main__':
    main() 