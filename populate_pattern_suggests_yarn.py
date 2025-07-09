#!/usr/bin/env python3
"""
Script to populate PatternSuggestsYarn table for existing patterns.
This creates the necessary relationships between patterns and yarn types
so that the multiple yarn support works correctly.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

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

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def populate_pattern_suggests_yarn():
    """Populate PatternSuggestsYarn table for existing patterns"""
    db = SessionLocal()
    
    try:
        print("Starting PatternSuggestsYarn population...")
        
        # Find patterns that don't have PatternSuggestsYarn entries but have yarn information
        query = """
        SELECT DISTINCT p.pattern_id, p.name, p.designer, p.yardage_min, p.yardage_max, p.grams_min, p.grams_max
        FROM Pattern p
        LEFT JOIN PatternSuggestsYarn psy ON p.pattern_id = psy.pattern_id
        WHERE psy.pattern_id IS NULL
        AND (p.yardage_min IS NOT NULL OR p.yardage_max IS NOT NULL OR p.grams_min IS NOT NULL OR p.grams_max IS NOT NULL)
        """
        
        patterns = db.execute(text(query)).fetchall()
        print(f"Found {len(patterns)} patterns without PatternSuggestsYarn entries")
        
        created_count = 0
        for pattern in patterns:
            pattern_id = pattern[0]
            pattern_name = pattern[1]
            designer = pattern[2]
            yardage_min = pattern[3]
            yardage_max = pattern[4]
            grams_min = pattern[5]
            grams_max = pattern[6]
            
            print(f"Processing pattern: {pattern_name} by {designer}")
            
            # Create a generic yarn type for this pattern
            yarn_id = f"generic_{pattern_id}"
            
            # Check if yarn type already exists
            existing_yarn = db.execute(
                text("SELECT yarn_id FROM YarnType WHERE yarn_id = :yarn_id"),
                {"yarn_id": yarn_id}
            ).fetchone()
            
            if not existing_yarn:
                # Create new yarn type
                db.execute(
                    text("""
                    INSERT INTO YarnType (yarn_id, yarn_name, brand, weight, fiber)
                    VALUES (:yarn_id, 'Generic Yarn', 'Unknown', 'Unknown', 'Unknown')
                    """),
                    {"yarn_id": yarn_id}
                )
                print(f"  - Created yarn type: {yarn_id}")
            
            # Create PatternSuggestsYarn entry
            db.execute(
                text("""
                INSERT INTO PatternSuggestsYarn (pattern_id, yarn_id, yardage_min, yardage_max, grams_min, grams_max)
                VALUES (:pattern_id, :yarn_id, :yardage_min, :yardage_max, :grams_min, :grams_max)
                """),
                {
                    "pattern_id": pattern_id,
                    "yarn_id": yarn_id,
                    "yardage_min": yardage_min,
                    "yardage_max": yardage_max,
                    "grams_min": grams_min,
                    "grams_max": grams_max
                }
            )
            
            created_count += 1
            print(f"  - Created PatternSuggestsYarn entry for pattern {pattern_id}")
        
        db.commit()
        print(f"Created PatternSuggestsYarn entries for {created_count} patterns")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

def update_yarn_weights_from_patterns():
    """Update yarn weights based on pattern required_weight"""
    db = SessionLocal()
    
    try:
        print("Updating yarn weights from pattern data...")
        
        # Find patterns with required_weight that have PatternSuggestsYarn entries
        query = """
        SELECT DISTINCT p.pattern_id, p.required_weight, psy.yarn_id
        FROM Pattern p
        JOIN PatternSuggestsYarn psy ON p.pattern_id = psy.pattern_id
        WHERE p.required_weight IS NOT NULL
        AND p.required_weight != 'Unknown'
        """
        
        patterns = db.execute(text(query)).fetchall()
        print(f"Found {len(patterns)} patterns with required_weight to update")
        
        updated_count = 0
        for pattern in patterns:
            pattern_id = pattern[0]
            required_weight = pattern[1]
            yarn_id = pattern[2]
            
            # Update the yarn weight
            db.execute(
                text("UPDATE YarnType SET weight = :weight WHERE yarn_id = :yarn_id"),
                {
                    "weight": required_weight,
                    "yarn_id": yarn_id
                }
            )
            
            updated_count += 1
            print(f"  - Updated yarn {yarn_id} weight to: {required_weight}")
        
        db.commit()
        print(f"Updated weights for {updated_count} yarn types")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # First, create PatternSuggestsYarn entries for patterns that don't have them
    populate_pattern_suggests_yarn()
    
    # Then, update yarn weights based on pattern required_weight
    update_yarn_weights_from_patterns()
    
    print("PatternSuggestsYarn population completed!") 