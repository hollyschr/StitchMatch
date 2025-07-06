#!/usr/bin/env python3
"""
Script to manually create database tables
"""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Float, ForeignKey

# Get DATABASE_URL from environment
DATABASE_URL = 'postgresql://postgres:GtvdUadWHTouvlzbyUvoWDaElhvxzTRX@trolley.proxy.rlwy.net:49018/railway'

print(f"Connecting to database: {DATABASE_URL}")

# Create engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

# Test connection
try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("✅ Database connection successful")
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    exit(1)

# Create tables
Base = declarative_base()

# Define models (copied from app.py)
class User(Base):
    __tablename__ = "User"
    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=True)
    profile_photo = Column(String, nullable=True)

class Pattern(Base):
    __tablename__ = "Pattern"
    pattern_id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    designer = Column(String)
    image = Column(String)
    pdf_file = Column(String, nullable=True)

class ProjectType(Base):
    __tablename__ = "ProjectType"
    project_type_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)

class CraftType(Base):
    __tablename__ = "CraftType"
    craft_type_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)

class YarnType(Base):
    __tablename__ = "YarnType"
    yarn_id = Column(String, primary_key=True, index=True)
    yarn_name = Column(String)
    brand = Column(String)
    weight = Column(String)
    fiber = Column(String)

class Tool(Base):
    __tablename__ = "Tool"
    tool_id = Column(Integer, primary_key=True, index=True)
    type = Column(String)
    size = Column(String)

class OwnsPattern(Base):
    __tablename__ = "OwnsPattern"
    user_id = Column(Integer, ForeignKey("User.user_id"), primary_key=True)
    pattern_id = Column(Integer, ForeignKey("Pattern.pattern_id"), primary_key=True)

class OwnsYarn(Base):
    __tablename__ = "OwnsYarn"
    user_id = Column(Integer, ForeignKey("User.user_id"), primary_key=True)
    yarn_id = Column(String, ForeignKey("YarnType.yarn_id"), primary_key=True)
    yardage = Column(Float)
    grams = Column(Float)

class OwnsTool(Base):
    __tablename__ = "OwnsTool"
    user_id = Column(Integer, ForeignKey("User.user_id"), primary_key=True)
    tool_id = Column(Integer, ForeignKey("Tool.tool_id"), primary_key=True)

class RequiresCraftType(Base):
    __tablename__ = "RequiresCraftType"
    pattern_id = Column(Integer, ForeignKey("Pattern.pattern_id"), primary_key=True)
    craft_type_id = Column(Integer, ForeignKey("CraftType.craft_type_id"))

class SuitableFor(Base):
    __tablename__ = "SuitableFor"
    pattern_id = Column(Integer, ForeignKey("Pattern.pattern_id"), primary_key=True)
    project_type_id = Column(Integer, ForeignKey("ProjectType.project_type_id"), primary_key=True)

class PatternSuggestsYarn(Base):
    __tablename__ = "PatternSuggestsYarn"
    pattern_id = Column(Integer, ForeignKey("Pattern.pattern_id"), primary_key=True)
    yarn_id = Column(String, ForeignKey("YarnType.yarn_id"), primary_key=True)
    yardage_min = Column(Float, nullable=True)
    yardage_max = Column(Float, nullable=True)
    grams_min = Column(Float, nullable=True)
    grams_max = Column(Float, nullable=True)

class PatternRequiresTool(Base):
    __tablename__ = "PatternRequiresTool"
    pattern_id = Column(Integer, ForeignKey("Pattern.pattern_id"), primary_key=True)
    tool_id = Column(Integer, ForeignKey("Tool.tool_id"), primary_key=True)

class HasLink_Link(Base):
    __tablename__ = "HasLink_Link"
    pattern_id = Column(Integer, ForeignKey("Pattern.pattern_id"), primary_key=True)
    link_id = Column(Integer, primary_key=True, autoincrement=True)
    url = Column(String)
    source = Column(String)
    price = Column(String, nullable=True)

class FavoritePattern(Base):
    __tablename__ = "FavoritePattern"
    user_id = Column(Integer, ForeignKey("User.user_id"), primary_key=True)
    pattern_id = Column(Integer, ForeignKey("Pattern.pattern_id"), primary_key=True)

print("Creating tables...")
try:
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully!")
except Exception as e:
    print(f"❌ Error creating tables: {e}")
    exit(1)

# Verify tables exist
try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        tables = [row[0] for row in result]
        print(f"✅ Tables in database: {tables}")
        
        if "Pattern" in tables:
            print("✅ Pattern table exists!")
        else:
            print("❌ Pattern table not found!")
            
except Exception as e:
    print(f"❌ Error checking tables: {e}") 