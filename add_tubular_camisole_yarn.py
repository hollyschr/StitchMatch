#!/usr/bin/env python3
"""
Script to add yarn information for Tubular Camisole pattern
"""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///StitchMatch.db')

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def add_tubular_camisole_yarn():
    """Add yarn information for Tubular Camisole pattern"""
    db = SessionLocal()
    
    try:
        print("Adding yarn information for Tubular Camisole...")
        
        # Pattern details
        pattern_id = 603  # Tubular Camisole
        pattern_name = "Tubular Camisole"
        designer = "Stefanie Japel"
        
        # Yarn information from Ravelry
        yarn_weight = "Aran / Worsted"
        yardage_min = 400
        yardage_max = 550
        grams_min = None  # Not provided
        grams_max = None  # Not provided
        
        # Create a yarn type for this pattern
        yarn_id = f"tubular_camisole_{pattern_id}"
        yarn_name = "Generic Yarn"
        brand = "Unknown"
        fiber = "Unknown"
        
        print(f"Processing pattern: {pattern_name} by {designer}")
        print(f"Yarn weight: {yarn_weight}")
        print(f"Yardage: {yardage_min} - {yardage_max} yards")
        
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
                VALUES (:yarn_id, :yarn_name, :brand, :weight, :fiber)
                """),
                {
                    "yarn_id": yarn_id,
                    "yarn_name": yarn_name,
                    "brand": brand,
                    "weight": yarn_weight,
                    "fiber": fiber
                }
            )
            print(f"  - Created yarn type: {yarn_id}")
        else:
            print(f"  - Yarn type already exists: {yarn_id}")
        
        # Check if PatternSuggestsYarn entry already exists
        existing_psy = db.execute(
            text("SELECT pattern_id FROM PatternSuggestsYarn WHERE pattern_id = :pattern_id AND yarn_id = :yarn_id"),
            {"pattern_id": pattern_id, "yarn_id": yarn_id}
        ).fetchone()
        
        if not existing_psy:
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
            print(f"  - Created PatternSuggestsYarn entry for pattern {pattern_id}")
        else:
            print(f"  - PatternSuggestsYarn entry already exists for pattern {pattern_id}")
        
        # Also update the Pattern table with the required_weight for backward compatibility
        db.execute(
            text("UPDATE Pattern SET required_weight = :weight WHERE pattern_id = :pattern_id"),
            {"weight": yarn_weight, "pattern_id": pattern_id}
        )
        print(f"  - Updated Pattern table with required_weight: {yarn_weight}")
        
        # Commit the changes
        db.commit()
        print("Successfully added yarn information for Tubular Camisole!")
        
        # Verify the entry was created
        result = db.execute(
            text("""
            SELECT p.name, p.designer, p.required_weight, psy.yardage_min, psy.yardage_max
            FROM Pattern p
            JOIN PatternSuggestsYarn psy ON p.pattern_id = psy.pattern_id
            WHERE p.pattern_id = :pattern_id
            """),
            {"pattern_id": pattern_id}
        ).fetchone()
        
        if result:
            print(f"\nVerification:")
            print(f"  Pattern: {result[0]} by {result[1]}")
            print(f"  Required Weight: {result[2]}")
            print(f"  Yardage: {result[3]} - {result[4]} yards")
        else:
            print("Warning: Could not verify the entry was created")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_tubular_camisole_yarn() 