#!/usr/bin/env python3
"""
Fix User table sequence for auto-increment
"""

import os
from sqlalchemy import create_engine, text

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///StitchMatch.db")

# Handle Railway's PostgreSQL URL format
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

def fix_user_sequence():
    """Fix the User table sequence for PostgreSQL"""
    if DATABASE_URL.startswith("sqlite"):
        print("SQLite database detected - no sequence fix needed")
        return
    
    print("Fixing User table sequence...")
    
    with engine.connect() as conn:
        try:
            # Get the current maximum user_id
            result = conn.execute(text("SELECT MAX(user_id) FROM \"User\""))
            max_id = result.scalar()
            
            if max_id is None:
                max_id = 0
            
            print(f"Current maximum user_id: {max_id}")
            
            # Reset the sequence to start after the maximum ID
            conn.execute(text(f"SELECT setval('\"User_user_id_seq\"', {max_id + 1}, false)"))
            
            # Commit the changes
            conn.commit()
            
            print(f"Sequence reset to start from: {max_id + 1}")
            print("✅ User table sequence fixed successfully!")
            
        except Exception as e:
            print(f"❌ Error fixing sequence: {e}")
            conn.rollback()

if __name__ == "__main__":
    fix_user_sequence() 