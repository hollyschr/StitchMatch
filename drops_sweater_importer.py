#!/usr/bin/env python3
"""
DROPS Sweater Pattern Importer
Imports DROPS sweater patterns (pullovers and cardigans) from Ravelry API
Uses existing infrastructure and API credentials
"""

import requests
import sqlite3
import time
import hashlib
import os

# Configuration - using existing credentials
API_USER = 'read-04fd0504792e7eb1281cddda677e4a54'
API_PASS = 'FQHaUH3AKHbEfl32NWHA59jCasP7Jt01PItrtVRF'
DATABASE_PATH = "StitchMatch.db"

def get_db_connection(db_path):
    """Establishes a connection to the SQLite database."""
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = 1")
    return conn

def get_or_create_id(cur, table, id_col, name_col, name_val, other_cols={}):
    """Get or create an ID from a lookup table."""
    if name_val is None or (isinstance(name_val, str) and not name_val.strip()):
        return None

    where_clause = f"{name_col} = ?"
    params = [name_val]
    for col, val in other_cols.items():
        where_clause += f" AND {col} = ?"
        params.append(val)

    cur.execute(f"SELECT {id_col} FROM {table} WHERE {where_clause}", params)
    result = cur.fetchone()
    if result:
        return result[0]

    all_cols = {name_col: name_val, **other_cols}
    columns = ", ".join(all_cols.keys())
    placeholders = ", ".join(["?"] * len(all_cols))
    
    cur.execute(f"INSERT INTO {table} ({columns}) VALUES ({placeholders})", list(all_cols.values()))
    return cur.lastrowid

def process_yarn_data(cur, pattern_id, full_pattern_data, total_yardage, total_yardage_max):
    """Process yarn information for a pattern."""
    if 'packs' not in full_pattern_data:
        return

    pattern_yarn_weight = full_pattern_data.get('yarn_weight_description')

    for pack in full_pattern_data['packs']:
        yarn_info = pack.get('yarn')
        if not yarn_info:
            continue

        yarn_name = yarn_info.get('name')
        brand = yarn_info.get('yarn_company_name')
        weight = pattern_yarn_weight or yarn_info.get('yarn_weight', {}).get('name')
        
        # Get fiber type
        fiber = None
        fiber_list = yarn_info.get('yarn_fibers', [])
        if fiber_list:
            fiber_types = [f.get('type') for f in fiber_list if f.get('type')]
            if fiber_types:
                fiber = ", ".join(fiber_types)
        
        if not fiber:
            fiber = yarn_info.get('fiber_type')

        grams = yarn_info.get('grams')

        if not (yarn_name and weight):
            continue

        yarn_id_str = f"{yarn_name}-{brand}-{weight}-{fiber}"
        yarn_id = hashlib.sha1(yarn_id_str.encode('utf-8')).hexdigest()

        cur.execute("SELECT 1 FROM YarnType WHERE yarn_id = ?", (yarn_id,))
        if not cur.fetchone():
            cur.execute("INSERT INTO YarnType (yarn_id, yarn_name, brand, weight, fiber) VALUES (?, ?, ?, ?, ?)",
                        (yarn_id, yarn_name, brand, weight, fiber))

        cur.execute("""
            INSERT OR IGNORE INTO PatternSuggestsYarn 
            (pattern_id, yarn_id, yardage_min, yardage_max, grams_min, grams_max) 
            VALUES (?, ?, ?, ?, ?, ?)""", (pattern_id, yarn_id, total_yardage, total_yardage_max, None, grams))

def fetch_drops_sweaters(db_connection, project_type):
    """Fetch DROPS sweater patterns for a specific project type."""
    SEARCH_API_URL = "https://api.ravelry.com/patterns/search.json"
    PATTERN_API_URL = "https://api.ravelry.com/patterns"
    PAGE_SIZE = 50 
    current_page = 1
    max_pages = 20  # Limit to prevent overwhelming the API
    
    print(f"-> Importing DROPS {project_type} patterns...")
    
    try:
        cur = db_connection.cursor()
        craft_id = get_or_create_id(cur, 'CraftType', 'craft_type_id', 'name', 'Knitting')
        project_type_id = get_or_create_id(cur, 'ProjectType', 'project_type_id', 'name', project_type)
        db_connection.commit()

        while current_page <= max_pages:
            # Search for DROPS patterns of the specific type
            params = { 
                'query': f'designer:"DROPS design" {project_type}', 
                'page_size': PAGE_SIZE, 
                'page': current_page,
                'sort': 'recently-popular'
            }
            
            print(f"   - Fetching page {current_page}/{max_pages} for DROPS {project_type}...")
            search_response = requests.get(SEARCH_API_URL, auth=(API_USER, API_PASS), params=params, timeout=20)
            
            if search_response.status_code == 500:
                print(f"   - SERVER ERROR on DROPS {project_type} search. Skipping.")
                return

            search_response.raise_for_status()
            
            basic_patterns = search_response.json().get('patterns', [])
            if not basic_patterns:
                print(f"   - No more DROPS {project_type} patterns found.")
                break

            patterns_processed = 0
            for basic_pat in basic_patterns:
                pattern_id = basic_pat.get('id')
                if not pattern_id: 
                    continue

                # Check if pattern already exists
                cur.execute("SELECT 1 FROM Pattern WHERE pattern_id = ?", (pattern_id,))
                if cur.fetchone():
                    print(f"     + Skipping existing pattern: {basic_pat.get('name')} (ID: {pattern_id})")
                    continue

                print(f"     + Processing new pattern: {basic_pat.get('name')} (ID: {pattern_id})...")
                time.sleep(0.5)
                
                detail_response = requests.get(f"{PATTERN_API_URL}/{pattern_id}.json", auth=(API_USER, API_PASS), timeout=20)
                if detail_response.status_code != 200: 
                    continue
                    
                full_pattern_data = detail_response.json().get('pattern')
                if not full_pattern_data: 
                    continue

                # Extract yardage information
                total_yardage = full_pattern_data.get('yardage')
                total_yardage_max = full_pattern_data.get('yardage_max')
                
                # Extract image URL
                image_url = None
                photos = full_pattern_data.get('photos', [])
                if photos and photos[0]:
                    image_url = photos[0].get('medium_url')

                # Insert pattern
                cur.execute("INSERT INTO Pattern (pattern_id, name, designer, image) VALUES (?, ?, ?, ?)", 
                            (pattern_id, full_pattern_data.get('name'), full_pattern_data.get('pattern_author', {}).get('name'), image_url))

                # Add craft type relationship
                cur.execute("INSERT INTO RequiresCraftType (pattern_id, craft_type_id) VALUES (?, ?)", (pattern_id, craft_id))

                # Add project type relationship
                if project_type_id:
                    cur.execute("INSERT INTO SuitableFor (pattern_id, project_type_id) VALUES (?, ?)", (pattern_id, project_type_id))
                
                # Process tool requirements
                if 'pattern_needle_sizes' in full_pattern_data:
                    for tool_data in full_pattern_data['pattern_needle_sizes']:
                        tool_size = tool_data.get('name')
                        if tool_size:
                            tool_id = get_or_create_id(cur, 'Tool', 'tool_id', 'size', tool_size, {'type': 'Needle'})
                            if tool_id:
                                cur.execute("INSERT INTO PatternRequiresTool (pattern_id, tool_id) VALUES (?, ?)", (pattern_id, tool_id))
                
                # Process yarn data
                process_yarn_data(cur, pattern_id, full_pattern_data, total_yardage, total_yardage_max)
                
                # Add pattern link
                permalink = full_pattern_data.get('permalink')
                if permalink:
                    price = full_pattern_data.get('price')
                    currency = full_pattern_data.get('currency')
                    price_str = f"{price} {currency}" if price and currency else "Free"

                    cur.execute("""
                        INSERT INTO HasLink_Link 
                        (pattern_id, link_id, url, source, price)
                        VALUES (?, 1, ?, 'Ravelry', ?)
                    """, (pattern_id, f"https://www.ravelry.com/patterns/library/{permalink}", price_str))

                patterns_processed += 1
                db_connection.commit()

            print(f"   - Processed {patterns_processed} new patterns on page {current_page}")
            
            if patterns_processed == 0:
                print(f"   - No new patterns found on page {current_page}, stopping...")
                break
                
            current_page += 1
            time.sleep(1)

    except requests.exceptions.RequestException as err:
        print(f"   - A network error occurred for DROPS {project_type}: {err}")
    except Exception as e:
        print(f"   - An unexpected error occurred for DROPS {project_type}: {e}")

def fetch_drops_sweaters_by_name(db_connection):
    """Fetch DROPS patterns with 'sweater' in the name."""
    SEARCH_API_URL = "https://api.ravelry.com/patterns/search.json"
    PATTERN_API_URL = "https://api.ravelry.com/patterns"
    PAGE_SIZE = 50 
    current_page = 1
    max_pages = 10  # Limit to prevent overwhelming the API
    
    print(f"-> Importing DROPS patterns with 'sweater' in the name...")
    
    try:
        cur = db_connection.cursor()
        craft_id = get_or_create_id(cur, 'CraftType', 'craft_type_id', 'name', 'Knitting')
        db_connection.commit()

        while current_page <= max_pages:
            # Search for DROPS patterns with sweater in the name
            params = { 
                'query': 'designer:"DROPS design" sweater', 
                'page_size': PAGE_SIZE, 
                'page': current_page,
                'sort': 'recently-popular'
            }
            
            print(f"   - Fetching page {current_page}/{max_pages} for DROPS sweater patterns...")
            search_response = requests.get(SEARCH_API_URL, auth=(API_USER, API_PASS), params=params, timeout=20)
            
            if search_response.status_code == 500:
                print(f"   - SERVER ERROR on DROPS sweater search. Skipping.")
                return

            search_response.raise_for_status()
            
            basic_patterns = search_response.json().get('patterns', [])
            if not basic_patterns:
                print(f"   - No more DROPS sweater patterns found.")
                break

            patterns_processed = 0
            for basic_pat in basic_patterns:
                pattern_id = basic_pat.get('id')
                if not pattern_id: 
                    continue

                # Check if pattern already exists
                cur.execute("SELECT 1 FROM Pattern WHERE pattern_id = ?", (pattern_id,))
                if cur.fetchone():
                    print(f"     + Skipping existing pattern: {basic_pat.get('name')} (ID: {pattern_id})")
                    continue

                print(f"     + Processing new pattern: {basic_pat.get('name')} (ID: {pattern_id})...")
                time.sleep(0.5)
                
                detail_response = requests.get(f"{PATTERN_API_URL}/{pattern_id}.json", auth=(API_USER, API_PASS), timeout=20)
                if detail_response.status_code != 200: 
                    continue
                    
                full_pattern_data = detail_response.json().get('pattern')
                if not full_pattern_data: 
                    continue

                # Extract yardage information
                total_yardage = full_pattern_data.get('yardage')
                total_yardage_max = full_pattern_data.get('yardage_max')
                
                # Extract image URL
                image_url = None
                photos = full_pattern_data.get('photos', [])
                if photos and photos[0]:
                    image_url = photos[0].get('medium_url')

                # Insert pattern
                cur.execute("INSERT INTO Pattern (pattern_id, name, designer, image) VALUES (?, ?, ?, ?)", 
                            (pattern_id, full_pattern_data.get('name'), full_pattern_data.get('pattern_author', {}).get('name'), image_url))

                # Add craft type relationship
                cur.execute("INSERT INTO RequiresCraftType (pattern_id, craft_type_id) VALUES (?, ?)", (pattern_id, craft_id))

                # Add project type relationship - determine if it's a pullover or cardigan
                pattern_name = full_pattern_data.get('name', '').lower()
                if 'cardigan' in pattern_name:
                    project_type_id = get_or_create_id(cur, 'ProjectType', 'project_type_id', 'name', 'Cardigan')
                else:
                    project_type_id = get_or_create_id(cur, 'ProjectType', 'project_type_id', 'name', 'Pullover')
                
                if project_type_id:
                    cur.execute("INSERT INTO SuitableFor (pattern_id, project_type_id) VALUES (?, ?)", (pattern_id, project_type_id))
                
                # Process tool requirements
                if 'pattern_needle_sizes' in full_pattern_data:
                    for tool_data in full_pattern_data['pattern_needle_sizes']:
                        tool_size = tool_data.get('name')
                        if tool_size:
                            tool_id = get_or_create_id(cur, 'Tool', 'tool_id', 'size', tool_size, {'type': 'Needle'})
                            if tool_id:
                                cur.execute("INSERT INTO PatternRequiresTool (pattern_id, tool_id) VALUES (?, ?)", (pattern_id, tool_id))
                
                # Process yarn data
                process_yarn_data(cur, pattern_id, full_pattern_data, total_yardage, total_yardage_max)
                
                # Add pattern link
                permalink = full_pattern_data.get('permalink')
                if permalink:
                    price = full_pattern_data.get('price')
                    currency = full_pattern_data.get('currency')
                    price_str = f"{price} {currency}" if price and currency else "Free"

                    cur.execute("""
                        INSERT INTO HasLink_Link 
                        (pattern_id, link_id, url, source, price)
                        VALUES (?, 1, ?, 'Ravelry', ?)
                    """, (pattern_id, f"https://www.ravelry.com/patterns/library/{permalink}", price_str))

                patterns_processed += 1
                db_connection.commit()

            print(f"   - Processed {patterns_processed} new patterns on page {current_page}")
            
            if patterns_processed == 0:
                print(f"   - No new patterns found on page {current_page}, stopping...")
                break
                
            current_page += 1
            time.sleep(1)

    except requests.exceptions.RequestException as err:
        print(f"   - A network error occurred for DROPS sweater patterns: {err}")
    except Exception as e:
        print(f"   - An unexpected error occurred for DROPS sweater patterns: {e}")

def main():
    """Main import function"""
    print("Starting DROPS sweater pattern import...")
    
    # Check if database exists
    if not os.path.exists(DATABASE_PATH):
        print(f"Database not found at {DATABASE_PATH}")
        return
    
    # Connect to database
    con = get_db_connection(DATABASE_PATH)
    
    try:
        # Import DROPS pullovers and cardigans
        sweater_types = ["Pullover", "Cardigan"]
        
        for project_type in sweater_types:
            fetch_drops_sweaters(con, project_type)
            time.sleep(2)  # Brief pause between types
        
        # Also search for patterns with "sweater" in the name
        fetch_drops_sweaters_by_name(con)
            
    finally:
        con.close()
        print("DROPS sweater import complete!")

if __name__ == "__main__":
    main() 