import requests
import sqlite3
import time
import hashlib

def get_db_connection(db_path):
    """Establishes a connection to the SQLite database."""
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = 1")
    return conn

def get_highest_pattern_id(db_connection):
    """Get the highest pattern ID currently in the database."""
    cur = db_connection.cursor()
    cur.execute("SELECT MAX(pattern_id) FROM Pattern")
    result = cur.fetchone()
    return result[0] if result[0] else 0

def get_or_create_id(cur, table, id_col, name_col, name_val, other_cols={}):
    """Final, correct version to get or create an ID from a lookup table."""
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
    """
    Correctly processes yarn information, using pattern-level yardage and yarn-level grams.
    """
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
        
        # New, more robust logic to find fiber type.
        fiber = None
        fiber_list = yarn_info.get('yarn_fibers', [])
        if fiber_list:
            fiber_types = [f.get('type') for f in fiber_list if f.get('type')]
            if fiber_types:
                fiber = ", ".join(fiber_types)
        
        if not fiber:
            # Fallback to the simpler fiber_type key if the list is empty or doesn't exist.
            fiber = yarn_info.get('fiber_type')

        # Correctly get grams from the yarn info within the pack
        grams = yarn_info.get('grams')

        if not (yarn_name and weight):
            continue

        yarn_id_str = f"{yarn_name}-{brand}-{weight}-{fiber}"
        yarn_id = hashlib.sha1(yarn_id_str.encode('utf-8')).hexdigest()

        cur.execute("SELECT 1 FROM YarnType WHERE yarn_id = ?", (yarn_id,))
        if not cur.fetchone():
            cur.execute("INSERT INTO YarnType (yarn_id, yarn_name, brand, weight, fiber) VALUES (?, ?, ?, ?, ?)",
                        (yarn_id, yarn_name, brand, weight, fiber))

        # Use pattern-level yardage and yarn-level grams.
        cur.execute("""
            INSERT OR IGNORE INTO PatternSuggestsYarn 
            (pattern_id, yarn_id, yardage_min, yardage_max, grams_min, grams_max) 
            VALUES (?, ?, ?, ?, ?, ?)""", (pattern_id, yarn_id, total_yardage, total_yardage_max, None, grams))

def pattern_exists(cur, pattern_id):
    """Check if a pattern already exists in the database."""
    cur.execute("SELECT 1 FROM Pattern WHERE pattern_id = ?", (pattern_id,))
    return cur.fetchone() is not None

def fetch_by_category(api_user, api_pass, db_connection, project_type, craft_name, min_pattern_id=0):
    """Optimized fetcher that only processes new patterns."""
    SEARCH_API_URL = "https://api.ravelry.com/patterns/search.json"
    PATTERN_API_URL = "https://api.ravelry.com/patterns"
    PAGE_SIZE = 50 
    MAX_PAGES = 60  # Reduced to 60 pages per category
    START_PAGE = 1   # Start from page 1 for fresh import
    current_page = START_PAGE
    new_patterns_count = 0
    skipped_patterns_count = 0
    
    db_craft_name = "Knitting" if craft_name == "Knitting" else "Crochet"
    tool_type = "Needle" if craft_name == "Knitting" else "Hook"
    
    print(f"-> Importing {db_craft_name} patterns for project type: '{project_type}' (min ID: {min_pattern_id})...")
    
    try:
        cur = db_connection.cursor()
        craft_id = get_or_create_id(cur, 'CraftType', 'craft_type_id', 'name', db_craft_name)
        db_connection.commit()

        while current_page <= MAX_PAGES:
            # Remove the 'availability' filter to get both free and paid patterns.
            params = { 'query': project_type, 'craft': craft_name, 'page_size': PAGE_SIZE, 'page': current_page }
            
            print(f"   - Fetching page {current_page}/{MAX_PAGES} for '{project_type}'...")
            search_response = requests.get(SEARCH_API_URL, auth=(api_user, api_pass), params=params, timeout=20)
            
            if search_response.status_code == 500:
                print(f"   - SERVER ERROR on '{project_type}' search. Skipping category.")
                return

            search_response.raise_for_status()
            
            basic_patterns = search_response.json().get('patterns', [])
            if not basic_patterns:
                print(f"   - No more patterns found for '{project_type}'.")
                break

            page_new_patterns = 0
            page_skipped_patterns = 0

            for basic_pat in basic_patterns:
                pattern_id = basic_pat.get('id')
                if not pattern_id: 
                    continue

                # Skip patterns with IDs less than or equal to our minimum
                if pattern_id <= min_pattern_id:
                    page_skipped_patterns += 1
                    continue

                # Check if pattern already exists in database
                if pattern_exists(cur, pattern_id):
                    page_skipped_patterns += 1
                    continue

                # Process new pattern
                print(f"     + Processing NEW pattern '{basic_pat.get('name')}' (ID: {pattern_id})...")
                time.sleep(0.5)
                
                detail_response = requests.get(f"{PATTERN_API_URL}/{pattern_id}.json", auth=(api_user, api_pass), timeout=20)
                if detail_response.status_code != 200: 
                    continue
                full_pattern_data = detail_response.json().get('pattern')
                if not full_pattern_data: 
                    continue

                # Extract yardage information
                total_yardage = full_pattern_data.get('yardage')
                total_yardage_max = full_pattern_data.get('yardage_max')
                
                # Extract the primary image URL
                image_url = None
                photos = full_pattern_data.get('photos', [])
                if photos and photos[0]:
                    image_url = photos[0].get('medium_url')

                # Insert new pattern
                cur.execute("INSERT INTO Pattern (pattern_id, name, designer, image) VALUES (?, ?, ?, ?)", 
                            (pattern_id, full_pattern_data.get('name'), full_pattern_data.get('pattern_author', {}).get('name'), image_url))

                cur.execute("INSERT INTO RequiresCraftType (pattern_id, craft_type_id) VALUES (?, ?)", (pattern_id, craft_id))

                pt_name = full_pattern_data.get('pattern_type', {}).get('name')
                if pt_name:
                    project_type_id = get_or_create_id(cur, 'ProjectType', 'project_type_id', 'name', pt_name)
                    if project_type_id:
                        cur.execute("INSERT INTO SuitableFor (pattern_id, project_type_id) VALUES (?, ?)", (pattern_id, project_type_id))
                
                if 'pattern_needle_sizes' in full_pattern_data:
                    for tool_data in full_pattern_data['pattern_needle_sizes']:
                        tool_size = tool_data.get('name')
                        if tool_size:
                            tool_id = get_or_create_id(cur, 'Tool', 'tool_id', 'size', tool_size, {'type': tool_type})
                            if tool_id:
                                cur.execute("INSERT INTO PatternRequiresTool (pattern_id, tool_id) VALUES (?, ?)", (pattern_id, tool_id))
                
                process_yarn_data(cur, pattern_id, full_pattern_data, total_yardage, total_yardage_max)
                
                permalink = full_pattern_data.get('permalink')
                if permalink:
                    # Handle price information
                    price = full_pattern_data.get('price')
                    currency = full_pattern_data.get('currency')
                    price_str = f"{price} {currency}" if price and currency else "Free"

                    cur.execute("""
                        INSERT INTO HasLink_Link 
                        (pattern_id, link_id, url, source, price)
                        VALUES (?, 1, ?, 'Ravelry', ?)
                    """, (pattern_id, f"https://www.ravelry.com/patterns/library/{permalink}", price_str))

                page_new_patterns += 1
                new_patterns_count += 1

            print(f"     - Page {current_page}: {page_new_patterns} new patterns, {page_skipped_patterns} skipped")
            db_connection.commit()

            # If we found no new patterns on this page, we can stop
            if page_new_patterns == 0 and page_skipped_patterns > 0:
                print(f"   - No new patterns found on page {current_page}, stopping for this category.")
                break

            current_page += 1
            time.sleep(1)

        print(f"   - Category '{project_type}' complete: {new_patterns_count} new patterns imported")

    except requests.exceptions.RequestException as err:
        print(f"   - A network error occurred for project '{project_type}': {err}. Skipping category.")
    except Exception as e:
        print(f"   - An unexpected error occurred for project '{project_type}': {e}. Skipping category.")

def main():
    API_USER = 'read-04fd0504792e7eb1281cddda677e4a54'
    API_PASS = 'FQHaUH3AKHbEfl32NWHA59jCasP7Jt01PItrtVRF'
    DB_PATH = 'StitchMatch.db'
    
    # Specific project types requested
    PROJECT_TYPES = [
        "shawl/wrap",
        "mittens/gloves", 
        "blanket",
        "tank/camisole",
        "dress/suit",
        "skirt",
        "dishcloth"
    ]
    
    con = get_db_connection(DB_PATH)
    
    try:
        # Start from pattern ID 0 to find any missing patterns
        min_pattern_id = 0
        print(f"Starting import from pattern ID: {min_pattern_id}")
        print(f"Importing patterns for project types: {', '.join(PROJECT_TYPES)}")
        
        total_new_patterns = 0

        # Import for both Knitting and Crochet
        for project in PROJECT_TYPES:
            print(f"\n=== Processing {project} ===")
            fetch_by_category(API_USER, API_PASS, con, project, "Knitting", min_pattern_id)
            
        for project in PROJECT_TYPES:
            print(f"\n=== Processing {project} ===")
            fetch_by_category(API_USER, API_PASS, con, project, "Crochet", min_pattern_id)
        
        # Get final count
        cur = con.cursor()
        cur.execute("SELECT COUNT(*) FROM Pattern")
        final_count = cur.fetchone()[0]
        print(f"\n--- Import Complete ---")
        print(f"Total patterns in database: {final_count}")
        
    finally:
        if con:
            con.close()

if __name__ == '__main__':
    main() 