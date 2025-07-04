#!/usr/bin/env python3
"""
Script to convert SQLite data to PostgreSQL and import to cloud database
"""

import sqlite3
import os
import psycopg2
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app import Base, User, Pattern, ProjectType, CraftType, YarnType, Tool, OwnsPattern, OwnsYarn, OwnsTool, RequiresCraftType, SuitableFor, PatternSuggestsYarn, PatternRequiresTool, HasLink_Link, FavoritePattern

def get_database_url():
    """Get database URL from environment or use local SQLite"""
    return os.getenv("DATABASE_URL", "sqlite:///StitchMatch.db")

def convert_sqlite_to_postgres():
    """Convert SQLite data to PostgreSQL format"""
    
    # Connect to local SQLite database
    sqlite_conn = sqlite3.connect('StitchMatch.db')
    sqlite_cursor = sqlite_conn.cursor()
    
    # Connect to cloud PostgreSQL database
    database_url = get_database_url()
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Drop all tables and recreate them (to ensure clean import)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        print("Starting data conversion...")
        
        # Import Users
        print("Importing Users...")
        sqlite_cursor.execute("SELECT user_id, name, email, password_hash, profile_photo FROM User")
        users = sqlite_cursor.fetchall()
        for user_data in users:
            user = User(
                user_id=user_data[0],
                name=user_data[1],
                email=user_data[2],
                password_hash=user_data[3],
                profile_photo=user_data[4]
            )
            db.add(user)
        print(f"Imported {len(users)} users")
        
        # Import ProjectTypes
        print("Importing ProjectTypes...")
        sqlite_cursor.execute("SELECT project_type_id, name FROM ProjectType")
        project_types = sqlite_cursor.fetchall()
        for pt_data in project_types:
            pt = ProjectType(project_type_id=pt_data[0], name=pt_data[1])
            db.add(pt)
        print(f"Imported {len(project_types)} project types")
        
        # Import CraftTypes
        print("Importing CraftTypes...")
        sqlite_cursor.execute("SELECT craft_type_id, name FROM CraftType")
        craft_types = sqlite_cursor.fetchall()
        for ct_data in craft_types:
            ct = CraftType(craft_type_id=ct_data[0], name=ct_data[1])
            db.add(ct)
        print(f"Imported {len(craft_types)} craft types")
        
        # Import YarnTypes
        print("Importing YarnTypes...")
        sqlite_cursor.execute("SELECT yarn_id, yarn_name, brand, weight, fiber FROM YarnType")
        yarn_types = sqlite_cursor.fetchall()
        valid_yarn_ids = set()
        for yt_data in yarn_types:
            if yt_data[0] is not None:
                yt = YarnType(
                    yarn_id=yt_data[0],
                    yarn_name=yt_data[1],
                    brand=yt_data[2],
                    weight=yt_data[3],
                    fiber=yt_data[4]
                )
                db.add(yt)
                valid_yarn_ids.add(yt_data[0])
        print(f"Imported {len(valid_yarn_ids)} yarn types (skipped {len(yarn_types) - len(valid_yarn_ids)})")
        
        # Import Tools
        print("Importing Tools...")
        sqlite_cursor.execute("SELECT tool_id, type, size FROM Tool")
        tools = sqlite_cursor.fetchall()
        for tool_data in tools:
            tool = Tool(tool_id=tool_data[0], type=tool_data[1], size=tool_data[2])
            db.add(tool)
        print(f"Imported {len(tools)} tools")
        
        # Import Patterns
        print("Importing Patterns...")
        sqlite_cursor.execute("SELECT pattern_id, name, designer, image, pdf_file FROM Pattern")
        patterns = sqlite_cursor.fetchall()
        for pattern_data in patterns:
            pattern = Pattern(
                pattern_id=pattern_data[0],
                name=pattern_data[1],
                designer=pattern_data[2],
                image=pattern_data[3],
                pdf_file=pattern_data[4]
            )
            db.add(pattern)
        print(f"Imported {len(patterns)} patterns")
        
        # Commit all main tables first
        db.commit()
        print("✅ Main tables imported successfully!")
        
        # Import relationship tables
        print("Importing relationships...")
        
        # Get all valid IDs from the cloud database after commit
        valid_user_ids = set(row[0] for row in db.query(User.user_id).all())
        valid_pattern_ids = set(row[0] for row in db.query(Pattern.pattern_id).all())
        valid_yarn_ids = set(row[0] for row in db.query(YarnType.yarn_id).all())
        valid_tool_ids = set(row[0] for row in db.query(Tool.tool_id).all())
        valid_craft_type_ids = set(row[0] for row in db.query(CraftType.craft_type_id).all())
        valid_project_type_ids = set(row[0] for row in db.query(ProjectType.project_type_id).all())
        
        print(f"Valid IDs found: {len(valid_user_ids)} users, {len(valid_pattern_ids)} patterns, {len(valid_yarn_ids)} yarns, {len(valid_tool_ids)} tools")
        
        # OwnsPattern
        print("Importing pattern ownerships...")
        sqlite_cursor.execute("SELECT user_id, pattern_id FROM OwnsPattern")
        owns_patterns = sqlite_cursor.fetchall()
        imported_owns_patterns = 0
        for op_data in owns_patterns:
            user_id, pattern_id = op_data
            if user_id in valid_user_ids and pattern_id in valid_pattern_ids:
                op = OwnsPattern(user_id=user_id, pattern_id=pattern_id)
                db.add(op)
                imported_owns_patterns += 1
        print(f"Imported {imported_owns_patterns} valid pattern ownerships (skipped {len(owns_patterns) - imported_owns_patterns})")
        
        # OwnsYarn
        print("Importing yarn ownerships...")
        sqlite_cursor.execute("SELECT user_id, yarn_id, yardage, grams FROM OwnsYarn")
        owns_yarns = sqlite_cursor.fetchall()
        imported_owns_yarns = 0
        for oy_data in owns_yarns:
            user_id, yarn_id = oy_data[0], oy_data[1]
            if user_id in valid_user_ids and yarn_id in valid_yarn_ids:
                oy = OwnsYarn(
                    user_id=user_id,
                    yarn_id=yarn_id,
                    yardage=oy_data[2],
                    grams=oy_data[3]
                )
                db.add(oy)
                imported_owns_yarns += 1
        print(f"Imported {imported_owns_yarns} valid yarn ownerships (skipped {len(owns_yarns) - imported_owns_yarns})")
        
        # OwnsTool
        print("Importing tool ownerships...")
        sqlite_cursor.execute("SELECT user_id, tool_id FROM OwnsTool")
        owns_tools = sqlite_cursor.fetchall()
        imported_owns_tools = 0
        for ot_data in owns_tools:
            user_id, tool_id = ot_data
            if user_id in valid_user_ids and tool_id in valid_tool_ids:
                ot = OwnsTool(user_id=user_id, tool_id=tool_id)
                db.add(ot)
                imported_owns_tools += 1
        print(f"Imported {imported_owns_tools} valid tool ownerships (skipped {len(owns_tools) - imported_owns_tools})")
        
        # RequiresCraftType
        print("Importing craft type requirements...")
        sqlite_cursor.execute("SELECT pattern_id, craft_type_id FROM RequiresCraftType")
        requires_crafts = sqlite_cursor.fetchall()
        imported_requires_crafts = 0
        for rc_data in requires_crafts:
            pattern_id, craft_type_id = rc_data
            if pattern_id in valid_pattern_ids and craft_type_id in valid_craft_type_ids:
                rc = RequiresCraftType(pattern_id=pattern_id, craft_type_id=craft_type_id)
                db.add(rc)
                imported_requires_crafts += 1
        print(f"Imported {imported_requires_crafts} valid craft type requirements (skipped {len(requires_crafts) - imported_requires_crafts})")
        
        # SuitableFor
        print("Importing project type suitability...")
        sqlite_cursor.execute("SELECT pattern_id, project_type_id FROM SuitableFor")
        suitable_fors = sqlite_cursor.fetchall()
        imported_suitable_fors = 0
        for sf_data in suitable_fors:
            pattern_id, project_type_id = sf_data
            if pattern_id in valid_pattern_ids and project_type_id in valid_project_type_ids:
                sf = SuitableFor(pattern_id=pattern_id, project_type_id=project_type_id)
                db.add(sf)
                imported_suitable_fors += 1
        print(f"Imported {imported_suitable_fors} valid project type suitability (skipped {len(suitable_fors) - imported_suitable_fors})")
        
        # PatternSuggestsYarn
        print("Importing pattern yarn suggestions...")
        sqlite_cursor.execute("SELECT pattern_id, yarn_id, yardage_min, yardage_max, grams_min, grams_max FROM PatternSuggestsYarn")
        pattern_yarns = sqlite_cursor.fetchall()
        imported_pattern_yarns = 0
        for py_data in pattern_yarns:
            pattern_id, yarn_id = py_data[0], py_data[1]
            if pattern_id in valid_pattern_ids and yarn_id in valid_yarn_ids:
                py = PatternSuggestsYarn(
                    pattern_id=pattern_id,
                    yarn_id=yarn_id,
                    yardage_min=py_data[2],
                    yardage_max=py_data[3],
                    grams_min=py_data[4],
                    grams_max=py_data[5]
                )
                db.add(py)
                imported_pattern_yarns += 1
        print(f"Imported {imported_pattern_yarns} valid pattern yarn suggestions (skipped {len(pattern_yarns) - imported_pattern_yarns})")
        
        # PatternRequiresTool
        print("Importing pattern tool requirements...")
        sqlite_cursor.execute("SELECT pattern_id, tool_id FROM PatternRequiresTool")
        pattern_tools = sqlite_cursor.fetchall()
        imported_pattern_tools = 0
        for pt_data in pattern_tools:
            pattern_id, tool_id = pt_data
            if pattern_id in valid_pattern_ids and tool_id in valid_tool_ids:
                pt = PatternRequiresTool(pattern_id=pattern_id, tool_id=tool_id)
                db.add(pt)
                imported_pattern_tools += 1
        print(f"Imported {imported_pattern_tools} valid pattern tool requirements (skipped {len(pattern_tools) - imported_pattern_tools})")
        
        # HasLink_Link
        print("Importing pattern links...")
        sqlite_cursor.execute("SELECT pattern_id, link_id, url, source, price FROM HasLink_Link")
        links = sqlite_cursor.fetchall()
        imported_links = 0
        for link_data in links:
            pattern_id = link_data[0]
            if pattern_id in valid_pattern_ids:
                link = HasLink_Link(
                    pattern_id=link_data[0],
                    link_id=link_data[1],
                    url=link_data[2],
                    source=link_data[3],
                    price=link_data[4]
                )
                db.add(link)
                imported_links += 1
        print(f"Imported {imported_links} valid pattern links (skipped {len(links) - imported_links})")
        
        # FavoritePattern
        print("Importing favorites...")
        sqlite_cursor.execute("SELECT user_id, pattern_id FROM FavoritePattern")
        favorites = sqlite_cursor.fetchall()
        imported_favorites = 0
        for fav_data in favorites:
            user_id, pattern_id = fav_data
            if user_id in valid_user_ids and pattern_id in valid_pattern_ids:
                fav = FavoritePattern(user_id=user_id, pattern_id=pattern_id)
                db.add(fav)
                imported_favorites += 1
        print(f"Imported {imported_favorites} valid favorites (skipped {len(favorites) - imported_favorites})")
        
        # Commit all changes
        db.commit()
        print("✅ Data conversion completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error during conversion: {e}")
        raise
    finally:
        db.close()
        sqlite_conn.close()

if __name__ == "__main__":
    convert_sqlite_to_postgres() 