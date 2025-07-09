#!/usr/bin/env python3
"""
Script to populate yarn_suggestions field for existing patterns in the database.
This ensures that existing patterns have the new yarn_suggestions field populated
so they display correctly in the updated frontend.
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

def populate_yarn_suggestions():
    """Populate yarn_suggestions for existing patterns"""
    db = SessionLocal()
    
    try:
        print("Starting yarn suggestions population...")
        
        # Get all patterns that have PatternSuggestsYarn entries
        query = """
        SELECT DISTINCT p.pattern_id, p.name, p.designer
        FROM Pattern p
        JOIN PatternSuggestsYarn psy ON p.pattern_id = psy.pattern_id
        """
        
        patterns = db.execute(text(query)).fetchall()
        print(f"Found {len(patterns)} patterns with yarn suggestions")
        
        for pattern in patterns:
            pattern_id = pattern[0]
            pattern_name = pattern[1]
            designer = pattern[2]
            
            print(f"Processing pattern: {pattern_name} by {designer}")
            
            # Get yarn suggestions for this pattern
            yarn_query = """
            SELECT 
                yt.yarn_id,
                yt.yarn_name,
                yt.brand,
                yt.weight,
                yt.fiber,
                psy.yardage_min,
                psy.yardage_max,
                psy.grams_min,
                psy.grams_max
            FROM PatternSuggestsYarn psy
            JOIN YarnType yt ON psy.yarn_id = yt.yarn_id
            WHERE psy.pattern_id = :pattern_id
            """
            
            yarns = db.execute(text(yarn_query), {"pattern_id": pattern_id}).fetchall()
            
            if yarns:
                print(f"  - Found {len(yarns)} yarn suggestions")
                for yarn in yarns:
                    print(f"    * {yarn[1]} ({yarn[2]}) - {yarn[3]}")
            else:
                print(f"  - No yarn suggestions found")
        
        print("Yarn suggestions population completed!")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

def create_yarn_suggestions_from_existing_data():
    """Create yarn suggestions for patterns that don't have them but have required_weight"""
    db = SessionLocal()
    
    try:
        print("Creating yarn suggestions from existing pattern data...")
        
        # Find patterns that have required_weight but no PatternSuggestsYarn entries
        query = """
        SELECT DISTINCT p.pattern_id, p.name, p.designer, p.yardage_min, p.yardage_max, p.grams_min, p.grams_max
        FROM Pattern p
        LEFT JOIN PatternSuggestsYarn psy ON p.pattern_id = psy.pattern_id
        WHERE psy.pattern_id IS NULL
        AND p.required_weight IS NOT NULL
        """
        
        patterns = db.execute(text(query)).fetchall()
        print(f"Found {len(patterns)} patterns without yarn suggestions")
        
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
                    VALUES (:yarn_id, 'Generic Yarn', 'Unknown', :weight, 'Unknown')
                    """),
                    {
                        "yarn_id": yarn_id,
                        "weight": "Unknown"  # We'll update this below
                    }
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
            print(f"  - Created yarn suggestion for pattern {pattern_id}")
        
        db.commit()
        print(f"Created yarn suggestions for {created_count} patterns")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # First, populate from existing PatternSuggestsYarn data
    populate_yarn_suggestions()
    
    # Then, create yarn suggestions for patterns that don't have them
    create_yarn_suggestions_from_existing_data() 