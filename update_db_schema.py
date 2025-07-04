import sqlite3
import os

def update_database_schema():
    """Update the database schema to add password_hash field to User table and description/price to Pattern table"""
    
    # Check if database exists
    if not os.path.exists('StitchMatch.db'):
        print("Database file not found. Please make sure StitchMatch.db exists.")
        return
    
    conn = sqlite3.connect('StitchMatch.db')
    cursor = conn.cursor()
    
    try:
        # Check if password_hash column already exists
        cursor.execute("PRAGMA table_info(User)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'password_hash' not in columns:
            print("Adding password_hash column to User table...")
            cursor.execute("ALTER TABLE User ADD COLUMN password_hash TEXT")
            print("✓ password_hash column added successfully")
        else:
            print("✓ password_hash column already exists")
        
        # Check if email column has unique constraint
        cursor.execute("PRAGMA index_list(User)")
        indexes = cursor.fetchall()
        email_unique_exists = any('email' in str(index) for index in indexes)
        
        if not email_unique_exists:
            print("Adding unique constraint to email column...")
            # Create a unique index on email
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email ON User(email)")
            print("✓ Unique constraint added to email column")
        else:
            print("✓ Email unique constraint already exists")
        
        # Check Pattern table for description and price columns
        cursor.execute("PRAGMA table_info(Pattern)")
        pattern_columns = [column[1] for column in cursor.fetchall()]
        
        if 'description' not in pattern_columns:
            print("Adding description column to Pattern table...")
            cursor.execute("ALTER TABLE Pattern ADD COLUMN description TEXT")
            print("✓ description column added successfully")
        else:
            print("✓ description column already exists")
            
        if 'price' not in pattern_columns:
            print("Adding price column to Pattern table...")
            cursor.execute("ALTER TABLE Pattern ADD COLUMN price REAL")
            print("✓ price column added successfully")
        else:
            print("✓ price column already exists")
            
        if 'project_type' not in pattern_columns:
            print("Adding project_type column to Pattern table...")
            cursor.execute("ALTER TABLE Pattern ADD COLUMN project_type TEXT")
            print("✓ project_type column added successfully")
        else:
            print("✓ project_type column already exists")
            
        if 'craft_type' not in pattern_columns:
            print("Adding craft_type column to Pattern table...")
            cursor.execute("ALTER TABLE Pattern ADD COLUMN craft_type TEXT")
            print("✓ craft_type column added successfully")
        else:
            print("✓ craft_type column already exists")
            
        if 'required_weight' not in pattern_columns:
            print("Adding required_weight column to Pattern table...")
            cursor.execute("ALTER TABLE Pattern ADD COLUMN required_weight TEXT")
            print("✓ required_weight column added successfully")
        else:
            print("✓ required_weight column already exists")
            
        if 'pattern_url' not in pattern_columns:
            print("Adding pattern_url column to Pattern table...")
            cursor.execute("ALTER TABLE Pattern ADD COLUMN pattern_url TEXT")
            print("✓ pattern_url column added successfully")
        else:
            print("✓ pattern_url column already exists")
            
        if 'yardage_min' not in pattern_columns:
            print("Adding yardage_min column to Pattern table...")
            cursor.execute("ALTER TABLE Pattern ADD COLUMN yardage_min REAL")
            print("✓ yardage_min column added successfully")
        else:
            print("✓ yardage_min column already exists")
            
        if 'yardage_max' not in pattern_columns:
            print("Adding yardage_max column to Pattern table...")
            cursor.execute("ALTER TABLE Pattern ADD COLUMN yardage_max REAL")
            print("✓ yardage_max column added successfully")
        else:
            print("✓ yardage_max column already exists")
            
        if 'grams_min' not in pattern_columns:
            print("Adding grams_min column to Pattern table...")
            cursor.execute("ALTER TABLE Pattern ADD COLUMN grams_min REAL")
            print("✓ grams_min column added successfully")
        else:
            print("✓ grams_min column already exists")
            
        if 'grams_max' not in pattern_columns:
            print("Adding grams_max column to Pattern table...")
            cursor.execute("ALTER TABLE Pattern ADD COLUMN grams_max REAL")
            print("✓ grams_max column added successfully")
        else:
            print("✓ grams_max column already exists")
        
        if 'pdf_file' not in pattern_columns:
            print("Adding pdf_file column to Pattern table...")
            cursor.execute("ALTER TABLE Pattern ADD COLUMN pdf_file TEXT")
            conn.commit()
            print("Successfully added pdf_file column to Pattern table!")
        else:
            print("pdf_file column already exists in Pattern table.")
        
    except Exception as e:
        print(f"Error updating database schema: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    update_database_schema() 