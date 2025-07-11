from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Boolean, or_, and_, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from pydantic import BaseModel
from typing import List, Optional
import hashlib
import secrets
import re
import random
import os

# Database configuration - supports both SQLite (local) and PostgreSQL (cloud)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///StitchMatch.db")

# Handle Railway's PostgreSQL URL format
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create PDF uploads directory if it doesn't exist
PDF_UPLOADS_DIR = "pdf_uploads"
os.makedirs(PDF_UPLOADS_DIR, exist_ok=True)

# Create engine with appropriate connect_args based on database type
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Create all tables
Base.metadata.create_all(bind=engine)

# Create additional indexes for better performance
def create_indexes():
    """Create additional indexes for better query performance"""
    db = SessionLocal()
    try:
        # Index for PatternSuggestsYarn lookups
        db.execute("CREATE INDEX IF NOT EXISTS idx_pattern_suggests_yarn_pattern ON PatternSuggestsYarn(pattern_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_pattern_suggests_yarn_yarn ON PatternSuggestsYarn(yarn_id)")
        
        # Index for YarnType weight lookups
        db.execute("CREATE INDEX IF NOT EXISTS idx_yarn_type_weight ON YarnType(weight)")
        
        # Index for OwnsYarn user lookups
        db.execute("CREATE INDEX IF NOT EXISTS idx_owns_yarn_user ON OwnsYarn(user_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_owns_yarn_yarn ON OwnsYarn(yarn_id)")
        
        # Index for pattern relationships
        db.execute("CREATE INDEX IF NOT EXISTS idx_requires_craft_type_pattern ON RequiresCraftType(pattern_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_suitable_for_pattern ON SuitableFor(pattern_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_has_link_pattern ON HasLink_Link(pattern_id)")
        
        # Index for OwnsPattern user lookups
        db.execute("CREATE INDEX IF NOT EXISTS idx_owns_pattern_user ON OwnsPattern(user_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_owns_pattern_pattern ON OwnsPattern(pattern_id)")
        
        db.commit()
        print("Database indexes created successfully")
    except Exception as e:
        print(f"Error creating indexes: {e}")
        db.rollback()
    finally:
        db.close()

# Create indexes on startup
create_indexes()

app = FastAPI()

# --- Auto-restore PDFs from cloud storage on startup ---
@app.on_event("startup")
def restore_pdfs_on_startup():
    try:
        from cloud_storage import CloudStorage
        storage = CloudStorage()
        restored_count = storage.restore_all_pdfs()
        print(f"[STARTUP] Restored {restored_count} PDFs from cloud storage.")
    except Exception as e:
        print(f"[STARTUP] Failed to restore PDFs from cloud storage: {e}")

# --- Fix User table sequence on startup ---
@app.on_event("startup")
def fix_user_sequence():
    try:
        if not DATABASE_URL.startswith("sqlite"):
            from sqlalchemy import text
            with engine.connect() as conn:
                # Get the current maximum user_id
                result = conn.execute(text("SELECT MAX(user_id) FROM \"User\""))
                max_id = result.scalar()
                
                if max_id is None:
                    max_id = 0
                
                print(f"[STARTUP] Current maximum user_id: {max_id}")
                
                # Reset the sequence to start after the maximum ID
                conn.execute(text(f"SELECT setval('\"User_user_id_seq\"', {max_id + 1}, false)"))
                conn.commit()
                
                print(f"[STARTUP] User sequence reset to start from: {max_id + 1}")
    except Exception as e:
        print(f"[STARTUP] Failed to fix user sequence: {e}")

# Removed HTTP to HTTPS redirection middleware - Railway handles this automatically

# Custom middleware to add cache-busting headers
class CacheControlMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://stitch-match.vercel.app",
        "https://stitch-match-git-main-hollyschr.vercel.app",
        "https://stitch-match-hollyschr.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3002",
        "http://localhost:3003",
        "http://192.168.1.95:3003",
        "*"  # Allow all origins for debugging
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600
)

# Add cache control middleware
app.add_middleware(CacheControlMiddleware)

# SQLAlchemy Models
class User(Base):
    __tablename__ = "User"
    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
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
    google_drive_file_id = Column(String, nullable=True)  # Store Google Drive file ID

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

# Pydantic Schemas
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    profile_photo: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    user_id: int
    name: str
    email: str
    profile_photo: Optional[str] = None

class PatternCreate(BaseModel):
    name: str
    designer: str
    image: str
    google_drive_file_id: Optional[str] = None  # Google Drive file ID
    # Metadata fields (these will be stored in normalized tables)
    yardage_min: Optional[float] = None
    yardage_max: Optional[float] = None
    grams_min: Optional[float] = None
    grams_max: Optional[float] = None
    project_type: Optional[str] = None
    craft_type: Optional[str] = None
    required_weight: Optional[str] = None

class YarnCreate(BaseModel):
    yarn_name: str
    brand: str
    weight: str
    fiber: str
    yardage: float
    grams: float

class ToolCreate(BaseModel):
    type: str
    size: str

class PatternResponse(BaseModel):
    pattern_id: int
    name: str
    designer: str
    image: Optional[str] = None
    google_drive_file_id: Optional[str] = None  # Google Drive file ID
    yardage_min: Optional[float] = None
    yardage_max: Optional[float] = None
    grams_min: Optional[float] = None
    grams_max: Optional[float] = None
    project_type: Optional[str] = None
    craft_type: Optional[str] = None
    required_weight: Optional[str] = None
    pattern_url: Optional[str] = None
    price: Optional[str] = None  # Price for imported patterns, None for user-uploaded patterns
    held_yarn_description: Optional[str] = None  # Description of held yarn calculation if applicable

class PaginatedPatternResponse(BaseModel):
    patterns: List[PatternResponse]
    pagination: dict

# Helper functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

# API Endpoints

@app.post("/auth/register", response_model=UserResponse)
def register_user(user: UserCreate):
    db = SessionLocal()
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        db.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = hash_password(user.password)
    db_user = User(
        name=user.name,
        email=user.email,
        password_hash=hashed_password,
        profile_photo=user.profile_photo
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    db.close()
    
    return UserResponse(
        user_id=db_user.user_id,
        name=db_user.name,
        email=db_user.email,
        profile_photo=str(db_user.profile_photo) if db_user.profile_photo is not None else None
    )

@app.post("/auth/login", response_model=UserResponse)
def login_user(user: UserLogin):
    db = SessionLocal()
    
    # Find user by email
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user:
        db.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(user.password, db_user.password_hash):
        db.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    db.close()
    
    return UserResponse(
        user_id=db_user.user_id,
        name=db_user.name,
        email=db_user.email,
        profile_photo=str(db_user.profile_photo) if db_user.profile_photo is not None else None
    )

@app.get("/users/{user_id}/patterns", response_model=List[PatternResponse])
@app.get("/users/{user_id}/patterns/", response_model=List[PatternResponse])
def get_user_patterns(user_id: int):
    db = SessionLocal()
    
    # Check if user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get patterns owned by the user
    user_patterns = db.query(Pattern).join(OwnsPattern).filter(OwnsPattern.user_id == user_id).all()
    
    # Build response with related data
    result = []
    for pattern in user_patterns:
        # Get craft type
        craft_type_result = db.query(CraftType.name).join(RequiresCraftType).filter(
            RequiresCraftType.pattern_id == pattern.pattern_id
        ).first()
        craft_type_name = craft_type_result[0] if craft_type_result else None
        
        # Get project type
        project_type_result = db.query(ProjectType.name).join(SuitableFor).filter(
            SuitableFor.pattern_id == pattern.pattern_id
        ).first()
        project_type_name = project_type_result[0] if project_type_result else None
        
        # Get yarn weight and yardage/grams from PatternSuggestsYarn
        yarn_result = db.query(YarnType.weight, PatternSuggestsYarn.yardage_min, PatternSuggestsYarn.yardage_max, PatternSuggestsYarn.grams_min, PatternSuggestsYarn.grams_max).join(PatternSuggestsYarn).filter(
            PatternSuggestsYarn.pattern_id == pattern.pattern_id
        ).first()
        yarn_weight = yarn_result[0] if yarn_result else None
        yardage_min = yarn_result[1] if yarn_result else None
        yardage_max = yarn_result[2] if yarn_result else None
        grams_min = yarn_result[3] if yarn_result else None
        grams_max = yarn_result[4] if yarn_result else None
        
        # For generic yarn types, don't show "Unknown" as the weight
        if yarn_weight == "Unknown":
            yarn_weight = None
        
        # Get pattern link and price
        link_result = db.query(HasLink_Link.url, HasLink_Link.price).filter(
            HasLink_Link.pattern_id == pattern.pattern_id
        ).first()
        
        # For imported patterns, use the HasLink_Link price and URL
        if link_result:
            pattern_url = link_result[0]  # Get the URL
            # Format price for display
            price_value = link_result[1]
            if price_value is not None:
                if price_value.lower() == 'free' or price_value == '0' or price_value == '0.0':
                    price_display = "Free"
                else:
                    # Keep the original price string as it may contain currency info
                    price_display = price_value
            else:
                price_display = None
        else:
            # This is a user-uploaded pattern, no price or URL
            pattern_url = None
            price_display = None
        
        result.append(PatternResponse(
            pattern_id=pattern.pattern_id,
            name=pattern.name,
            designer=pattern.designer,
            image=pattern.image if pattern.image is not None else "/placeholder.svg",
            google_drive_file_id=pattern.google_drive_file_id,
            yardage_min=yardage_min,
            yardage_max=yardage_max,
            grams_min=grams_min,
            grams_max=grams_max,
            project_type=project_type_name,
            craft_type=craft_type_name,
            required_weight=yarn_weight,
            pattern_url=pattern_url,
            price=price_display
        ))
    
    db.close()
    return result

@app.post("/users/{user_id}/patterns/")
def add_pattern(user_id: int, pattern: PatternCreate):
    db = SessionLocal()
    
    # Check if user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Extract metadata fields from pattern data
    pattern_data = pattern.dict()
    metadata_fields = {
        'yardage_min': pattern_data.pop('yardage_min', None),
        'yardage_max': pattern_data.pop('yardage_max', None),
        'grams_min': pattern_data.pop('grams_min', None),
        'grams_max': pattern_data.pop('grams_max', None),
        'project_type': pattern_data.pop('project_type', None),
        'craft_type': pattern_data.pop('craft_type', None),
        'required_weight': pattern_data.pop('required_weight', None),
    }
    
    # Check if pattern already exists (by name and designer)
    existing_pattern = db.query(Pattern).filter(
        Pattern.name == pattern_data['name'],
        Pattern.designer == pattern_data['designer']
    ).first()
    
    if existing_pattern:
        # Pattern already exists, use existing pattern_id
        pattern_id = existing_pattern.pattern_id
    else:
        # Create new pattern (only core fields)
        db_pattern = Pattern(**pattern_data)
        db.add(db_pattern)
        db.commit()
        db.refresh(db_pattern)
        pattern_id = db_pattern.pattern_id
    
    # Insert metadata into normalized tables
    
    # 1. Handle craft type
    if metadata_fields['craft_type']:
        craft_type_obj = db.query(CraftType).filter(
            CraftType.name.ilike(metadata_fields['craft_type'])
        ).first()
        if craft_type_obj:
            # Only add a craft type if the pattern does not already have any craft type
            existing_craft_type = db.query(RequiresCraftType).filter(
                RequiresCraftType.pattern_id == pattern_id
            ).first()
            if not existing_craft_type:
                db_requires_craft = RequiresCraftType(
                    pattern_id=pattern_id,
                    craft_type_id=craft_type_obj.craft_type_id
                )
                db.add(db_requires_craft)

    # 2. Handle project type
    if metadata_fields['project_type']:
        project_type_obj = db.query(ProjectType).filter(
            ProjectType.name.ilike(metadata_fields['project_type'])
        ).first()
        if project_type_obj:
            # Check if project type relationship already exists
            existing_project_type = db.query(SuitableFor).filter(
                SuitableFor.pattern_id == pattern_id,
                SuitableFor.project_type_id == project_type_obj.project_type_id
            ).first()
            if not existing_project_type:
                db_suitable_for = SuitableFor(
                    pattern_id=pattern_id,
                    project_type_id=project_type_obj.project_type_id
                )
                db.add(db_suitable_for)

    # 3. Handle yarn weight and yardage/grams
    if metadata_fields['required_weight']:
        yarn_type_obj = db.query(YarnType).filter(
            YarnType.weight.ilike(metadata_fields['required_weight'])
        ).first()
        if not yarn_type_obj:
            # Create a new YarnType if it doesn't exist
            yarn_type_obj = YarnType(
                yarn_id=f"{metadata_fields['required_weight']}_generic_{pattern_id}",
                yarn_name="Generic Yarn",
                brand="Unknown",
                weight=metadata_fields['required_weight'],
                fiber="Unknown"
            )
            db.add(yarn_type_obj)
        # Only add PatternSuggestsYarn if it doesn't already exist
        existing_psy = db.query(PatternSuggestsYarn).filter(
            PatternSuggestsYarn.pattern_id == pattern_id,
            PatternSuggestsYarn.yarn_id == yarn_type_obj.yarn_id
        ).first()
        if not existing_psy:
            db_pattern_suggests_yarn = PatternSuggestsYarn(
                pattern_id=pattern_id,
                yarn_id=yarn_type_obj.yarn_id,
                yardage_min=metadata_fields['yardage_min'],
                yardage_max=metadata_fields['yardage_max'],
                grams_min=metadata_fields['grams_min'],
                grams_max=metadata_fields['grams_max']
            )
            db.add(db_pattern_suggests_yarn)
    # If no yarn weight specified but yardage/grams are provided, create a generic yarn type
    elif metadata_fields['yardage_min'] or metadata_fields['yardage_max'] or metadata_fields['grams_min'] or metadata_fields['grams_max']:
        # Create a generic yarn type for patterns without specific weight
        generic_yarn_id = f"generic_{pattern_id}"
        generic_yarn = db.query(YarnType).filter(YarnType.yarn_id == generic_yarn_id).first()
        if not generic_yarn:
            generic_yarn = YarnType(
                yarn_id=generic_yarn_id,
                yarn_name="Generic Yarn",
                brand="Unknown",
                weight="Unknown",
                fiber="Unknown"
            )
            db.add(generic_yarn)
        existing_psy = db.query(PatternSuggestsYarn).filter(
            PatternSuggestsYarn.pattern_id == pattern_id,
            PatternSuggestsYarn.yarn_id == generic_yarn_id
        ).first()
        if not existing_psy:
            db_pattern_suggests_yarn = PatternSuggestsYarn(
                pattern_id=pattern_id,
                yarn_id=generic_yarn_id,
                yardage_min=metadata_fields['yardage_min'],
                yardage_max=metadata_fields['yardage_max'],
                grams_min=metadata_fields['grams_min'],
                grams_max=metadata_fields['grams_max']
            )
            db.add(db_pattern_suggests_yarn)
    
    # 4. Price handling is not needed for user-uploaded patterns since they're already owned
    
    # Link pattern to user (check if ownership already exists)
    existing_ownership = db.query(OwnsPattern).filter(
        OwnsPattern.user_id == user_id,
        OwnsPattern.pattern_id == pattern_id
    ).first()
    if not existing_ownership:
        db_owns = OwnsPattern(user_id=user_id, pattern_id=pattern_id)
        db.add(db_owns)
    
    db.commit()
    db.close()
    
    return {"pattern_id": pattern_id}

@app.put("/users/{user_id}/patterns/{pattern_id}/")
def update_user_pattern(user_id: int, pattern_id: int, pattern: PatternCreate):
    """Update an existing user pattern"""
    db = SessionLocal()
    
    # Check if user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if pattern exists and belongs to user
    existing_pattern = db.query(Pattern).join(OwnsPattern).filter(
        Pattern.pattern_id == pattern_id,
        OwnsPattern.user_id == user_id
    ).first()
    
    if not existing_pattern:
        db.close()
        raise HTTPException(status_code=404, detail="Pattern not found or not owned by user")
    
    # Update basic pattern information
    existing_pattern.name = pattern.name
    existing_pattern.designer = pattern.designer
    existing_pattern.image = pattern.image
    if pattern.google_drive_file_id:
        existing_pattern.google_drive_file_id = pattern.google_drive_file_id
    
    # Update craft type
    if pattern.craft_type:
        craft_type = db.query(CraftType).filter(CraftType.name == pattern.craft_type).first()
        if not craft_type:
            craft_type = CraftType(name=pattern.craft_type)
            db.add(craft_type)
            db.flush()  # Get the ID
        
        # Remove existing craft type associations
        db.query(RequiresCraftType).filter(RequiresCraftType.pattern_id == pattern_id).delete()
        
        # Add new craft type association
        requires_craft = RequiresCraftType(pattern_id=pattern_id, craft_type_id=craft_type.craft_type_id)
        db.add(requires_craft)
    
    # Update project type
    if pattern.project_type:
        project_type = db.query(ProjectType).filter(ProjectType.name == pattern.project_type).first()
        if not project_type:
            project_type = ProjectType(name=pattern.project_type)
            db.add(project_type)
            db.flush()  # Get the ID
        
        # Remove existing project type associations
        db.query(SuitableFor).filter(SuitableFor.pattern_id == pattern_id).delete()
        
        # Add new project type association
        suitable_for = SuitableFor(pattern_id=pattern_id, project_type_id=project_type.project_type_id)
        db.add(suitable_for)
    
    # Update yarn information
    if pattern.required_weight:
        # Find or create yarn type
        yarn_type = db.query(YarnType).filter(YarnType.weight == pattern.required_weight).first()
        if not yarn_type:
            # Create a generic yarn type for this weight
            yarn_type = YarnType(
                yarn_id=f"generic_{pattern.required_weight.lower().replace(' ', '_')}",
                yarn_name=f"Generic {pattern.required_weight}",
                brand="Generic",
                weight=pattern.required_weight,
                fiber="Unknown"
            )
            db.add(yarn_type)
            db.flush()
        
        # Remove existing yarn associations
        db.query(PatternSuggestsYarn).filter(PatternSuggestsYarn.pattern_id == pattern_id).delete()
        
        # Add new yarn association
        pattern_suggests_yarn = PatternSuggestsYarn(
            pattern_id=pattern_id,
            yarn_id=yarn_type.yarn_id,
            yardage_min=pattern.yardage_min,
            yardage_max=pattern.yardage_max,
            grams_min=pattern.grams_min,
            grams_max=pattern.grams_max
        )
        db.add(pattern_suggests_yarn)
    
    try:
        db.commit()
        db.close()
        return {"message": "Pattern updated successfully"}
    except Exception as e:
        db.rollback()
        db.close()
        raise HTTPException(status_code=500, detail=f"Failed to update pattern: {str(e)}")

@app.delete("/users/{user_id}/patterns/{pattern_id}/")
def delete_user_pattern(user_id: int, pattern_id: int):
    db = SessionLocal()
    
    # Check if user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if pattern exists and is owned by the user
    owns_pattern = db.query(OwnsPattern).filter(
        OwnsPattern.user_id == user_id,
        OwnsPattern.pattern_id == pattern_id
    ).first()
    
    if not owns_pattern:
        db.close()
        raise HTTPException(status_code=404, detail="Pattern not found in user's collection")
    
    # Check if this is an imported pattern (has HasLink_Link entry)
    has_link = db.query(HasLink_Link).filter(
        HasLink_Link.pattern_id == pattern_id
    ).first()
    
    if has_link:
        # This is an imported pattern - users cannot delete imported patterns
        db.close()
        raise HTTPException(status_code=403, detail="Cannot delete imported patterns. You can only remove them from your collection.")
    
    # This is a user-uploaded pattern, delete the pattern and all related data
    # First, delete related data in the correct order to avoid foreign key constraints
    
    # Delete yarn suggestions
    db.query(PatternSuggestsYarn).filter(
        PatternSuggestsYarn.pattern_id == pattern_id
    ).delete()
    
    # Delete craft type requirements
    db.query(RequiresCraftType).filter(
        RequiresCraftType.pattern_id == pattern_id
    ).delete()
    
    # Delete project type suitability
    db.query(SuitableFor).filter(
        SuitableFor.pattern_id == pattern_id
    ).delete()
    
    # Delete tool requirements
    db.query(PatternRequiresTool).filter(
        PatternRequiresTool.pattern_id == pattern_id
    ).delete()
    
    # Delete ownership relationships (for all users)
    db.query(OwnsPattern).filter(
        OwnsPattern.pattern_id == pattern_id
    ).delete()
    
    # Finally, delete the pattern itself
    pattern = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if pattern:
        db.delete(pattern)
    
    db.commit()
    db.close()
    return {"message": "User-uploaded pattern and all related data deleted"}

@app.post("/users/{user_id}/yarn/")
def add_yarn(user_id: int, yarn: YarnCreate):
    db = SessionLocal()
    try:
        # Check if user exists
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate a unique yarn_id (using hash of yarn details)
        yarn_id = hashlib.sha256(f"{yarn.yarn_name}{yarn.brand}{yarn.weight}{yarn.fiber}".encode()).hexdigest()
        
        # Check if yarn type already exists
        existing_yarn = db.query(YarnType).filter(YarnType.yarn_id == yarn_id).first()
        if not existing_yarn:
            db_yarn = YarnType(
                yarn_id=yarn_id,
                yarn_name=yarn.yarn_name,
                brand=yarn.brand,
                weight=yarn.weight,
                fiber=yarn.fiber
            )
            db.add(db_yarn)
            db.flush()  # Get the yarn_id without committing
        
        # Check if user already owns this yarn
        existing_ownership = db.query(OwnsYarn).filter(
            OwnsYarn.user_id == user_id,
            OwnsYarn.yarn_id == yarn_id
        ).first()
        
        if existing_ownership:
            raise HTTPException(status_code=400, detail="User already owns this yarn")
        
        # Add to user's stash
        db_owns = OwnsYarn(
            user_id=user_id,
            yarn_id=yarn_id,
            yardage=yarn.yardage,
            grams=yarn.grams
        )
        db.add(db_owns)
        
        # Commit all operations together
        db.commit()
        
        return {"yarn_id": yarn_id}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding yarn: {str(e)}")
    finally:
        db.close()

@app.get("/users/{user_id}/tools")
@app.get("/users/{user_id}/tools/")
def get_user_tools(user_id: int):
    db = SessionLocal()
    
    # Check if user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all tools owned by the user
    tools = db.query(Tool).join(OwnsTool).filter(OwnsTool.user_id == user_id).all()
    
    result = []
    for tool in tools:
        result.append({
            "id": str(tool.tool_id),
            "type": tool.type,
            "size": tool.size
        })
    
    db.close()
    return result

@app.post("/users/{user_id}/tools/")
def add_tool(user_id: int, tool: ToolCreate):
    db = SessionLocal()
    try:
        # Check if user exists
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if tool already exists
        existing_tool = db.query(Tool).filter(
            Tool.type == tool.type,
            Tool.size == tool.size
        ).first()
        
        if existing_tool:
            # Tool already exists, check if user already owns it
            existing_ownership = db.query(OwnsTool).filter(
                OwnsTool.user_id == user_id,
                OwnsTool.tool_id == existing_tool.tool_id
            ).first()
            
            if existing_ownership:
                # User already owns this tool
                raise HTTPException(status_code=400, detail="You already own this tool")
            
            # Create ownership relationship for existing tool
            db_owns = OwnsTool(user_id=user_id, tool_id=existing_tool.tool_id)
            db.add(db_owns)
            db.commit()
            
            return {"tool_id": existing_tool.tool_id}
        else:
            # Create new tool
            db_tool = Tool(type=tool.type, size=tool.size)
            db.add(db_tool)
            db.flush()  # Get the tool_id without committing
            
            # Create the ownership relationship
            db_owns = OwnsTool(user_id=user_id, tool_id=db_tool.tool_id)
            db.add(db_owns)
            
            # Commit both operations together
            db.commit()
            
            return {"tool_id": db_tool.tool_id}
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        db.rollback()
        print(f"Error adding tool: {str(e)}")
        print(f"Tool data: type={tool.type}, size={tool.size}")
        print(f"User ID: {user_id}")
        raise HTTPException(status_code=500, detail=f"Error adding tool: {str(e)}")
    finally:
        db.close()

@app.delete("/users/{user_id}/tools/{tool_id}")
def delete_user_tool(user_id: int, tool_id: int):
    db = SessionLocal()
    
    # Check if user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if the tool exists and is owned by the user
    owns_tool = db.query(OwnsTool).filter(
        OwnsTool.user_id == user_id,
        OwnsTool.tool_id == tool_id
    ).first()
    
    if not owns_tool:
        db.close()
        raise HTTPException(status_code=404, detail="Tool not found or not owned by user")
    
    # Delete the ownership relationship
    db.delete(owns_tool)
    
    # Check if any other users own this tool
    other_owners = db.query(OwnsTool).filter(OwnsTool.tool_id == tool_id).count()
    
    # If no other users own this tool, delete the tool itself
    if other_owners == 0:
        tool = db.query(Tool).filter(Tool.tool_id == tool_id).first()
        if tool:
            db.delete(tool)
    
    db.commit()
    db.close()
    return {"message": "Tool deleted successfully"}

@app.get("/patterns", response_model=PaginatedPatternResponse)
@app.get("/patterns/", response_model=PaginatedPatternResponse)
def get_all_patterns(
    page: int = 1,
    page_size: int = 30,
    project_type: Optional[str] = None,
    craft_type: Optional[str] = None,
    weight: Optional[str] = None,
    designer: Optional[str] = None,
    uploaded_only: Optional[bool] = None,
    shuffle: Optional[bool] = None,
    free_only: Optional[bool] = None,
    user_id: Optional[int] = None,
    name: Optional[str] = None  # <-- Add this line
):
    # Validate pagination parameters
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 30
    if page_size > 100:
        page_size = 100
    
    db = SessionLocal()
    try:
        # Start with all patterns
        query = db.query(Pattern)
        # Apply filters
        if project_type:
            # Map frontend project type to database value
            db_project_type = map_frontend_project_type_to_db(project_type)
            query = query.join(SuitableFor).join(ProjectType).filter(
                ProjectType.name == db_project_type
            )
        if craft_type:
            query = query.join(RequiresCraftType).join(CraftType).filter(
                CraftType.name.ilike(f"%{craft_type}%")
            )
        if weight:
            query = query.join(PatternSuggestsYarn).join(YarnType).filter(
                YarnType.weight.ilike(f"%{weight}%")
            )
        if designer:
            query = query.filter(Pattern.designer.ilike(f"%{designer}%"))
        if name:  # <-- Add this block
            query = query.filter(Pattern.name.ilike(f"%{name}%"))
        if uploaded_only:
            if not user_id:
                db.close()
                raise HTTPException(status_code=400, detail="user_id is required when uploaded_only is true")
            # Only show patterns uploaded by this user
            query = query.join(OwnsPattern).filter(OwnsPattern.user_id == user_id)
        if free_only:
            # Filter for patterns that have free prices in HasLink_Link
            query = query.filter(
                db.query(HasLink_Link.pattern_id).filter(
                    (HasLink_Link.pattern_id == Pattern.pattern_id) &
                    ((HasLink_Link.price.ilike('free')) |
                     (HasLink_Link.price == '0') |
                     (HasLink_Link.price == '0.0') |
                     (HasLink_Link.price.ilike('$0.00')) |
                     (HasLink_Link.price.ilike('0.0 gbp')) |
                     (HasLink_Link.price.ilike('0.0 dkk')) |
                     (HasLink_Link.price.ilike('0.0 usd')))
                ).exists()
            )
        # Get total count for pagination
        total_count = query.count()
        # Apply pagination - ensure page_size is not zero
        if page_size <= 0:
            page_size = 30
        offset = (page - 1) * page_size
        patterns = query.limit(page_size).offset(offset).all()
        # Build response with related data
        result = []
        for pattern in patterns:
            # Get craft type
            craft_type_result = db.query(CraftType.name).join(RequiresCraftType).filter(
                RequiresCraftType.pattern_id == pattern.pattern_id
            ).first()
            craft_type_name = craft_type_result[0] if craft_type_result else None
            # Get project type
            project_type_result = db.query(ProjectType.name).join(SuitableFor).filter(
                SuitableFor.pattern_id == pattern.pattern_id
            ).first()
            project_type_name = project_type_result[0] if project_type_result else None
            # Get yarn weight and yardage/grams from PatternSuggestsYarn
            yarn_result = db.query(
                YarnType.weight, PatternSuggestsYarn.yardage_min, PatternSuggestsYarn.yardage_max, PatternSuggestsYarn.grams_min, PatternSuggestsYarn.grams_max
            ).join(PatternSuggestsYarn).filter(
                PatternSuggestsYarn.pattern_id == pattern.pattern_id
            ).first()
            yarn_weight = yarn_result[0] if yarn_result else None
            yardage_min = yarn_result[1] if yarn_result else None
            yardage_max = yarn_result[2] if yarn_result else None
            grams_min = yarn_result[3] if yarn_result else None
            grams_max = yarn_result[4] if yarn_result else None
            # Get pattern link and price
            link_result = db.query(HasLink_Link.url, HasLink_Link.price).filter(
                HasLink_Link.pattern_id == pattern.pattern_id
            ).first()
            # For imported patterns, use the HasLink_Link price and URL
            if link_result:
                pattern_url = link_result[0]  # Get the URL
                # Format price for display
                price_value = link_result[1]
                if price_value is not None:
                    if price_value.lower() == 'free' or price_value == '0' or price_value == '0.0':
                        price_display = "Free"
                    else:
                        # Keep the original price string as it may contain currency info
                        price_display = price_value
                else:
                    price_display = None
            else:
                # This is a user-uploaded pattern, no price or URL
                pattern_url = None
                price_display = None
            result.append(PatternResponse(
                pattern_id=pattern.pattern_id,
                name=pattern.name,
                designer=pattern.designer,
                image=pattern.image if pattern.image is not None else "/placeholder.svg",
                google_drive_file_id=pattern.google_drive_file_id,
                yardage_min=yardage_min,
                yardage_max=yardage_max,
                grams_min=grams_min,
                grams_max=grams_max,
                project_type=project_type_name,
                craft_type=craft_type_name,
                required_weight=yarn_weight,
                pattern_url=pattern_url,
                price=price_display
            ))
        # Remove Python-side free_only filtering
        # Shuffle results if requested (after filtering)
        if shuffle:
            random.shuffle(result)
        # Calculate pagination info - ensure page_size is not zero to prevent division by zero
        if page_size <= 0:
            page_size = 30
        total_pages = (total_count + page_size - 1) // page_size
        return PaginatedPatternResponse(
            patterns=result,
            pagination={
                "page": page,
                "page_size": page_size,
                "total": total_count,
                "pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        )
    except Exception as e:
        db.close()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        db.close()

@app.get("/test")
def test_endpoint():
    return {"message": "Backend is working!"}

@app.get("/test-cors")
def test_cors():
    """Test endpoint to verify CORS headers are working"""
    return {"message": "CORS test successful", "timestamp": "2024-01-01T00:00:00Z"}

@app.get("/test-db")
def test_database():
    """Test database connection and table creation"""
    db = SessionLocal()
    try:
        # Test if tables exist by trying to query them
        pattern_count = db.query(Pattern).count()
        user_count = db.query(User).count()
        db.close()
        return {
            "message": "Database connection successful",
            "pattern_count": pattern_count,
            "user_count": user_count,
            "tables_exist": True,
            "database_url": DATABASE_URL[:20] + "..." if DATABASE_URL else "Not set"
        }
    except Exception as e:
        db.close()
        return {
            "message": "Database error",
            "error": str(e),
            "tables_exist": False,
            "database_url": DATABASE_URL[:20] + "..." if DATABASE_URL else "Not set"
        }

@app.get("/debug-env")
def debug_environment():
    """Debug environment variables"""
    return {
        "database_url": DATABASE_URL[:50] + "..." if DATABASE_URL else "Not set",
        "database_type": "PostgreSQL" if DATABASE_URL and "postgres" in DATABASE_URL else "SQLite" if DATABASE_URL and "sqlite" in DATABASE_URL else "Unknown"
    }

@app.get("/test-patterns")
def test_patterns():
    db = SessionLocal()
    try:
        patterns = db.query(Pattern).limit(5).all()
        result = []
        for p in patterns:
            result.append({
                "pattern_id": p.pattern_id,
                "name": p.name,
                "designer": p.designer
            })
        db.close()
        return {"patterns": result}
    except Exception as e:
        db.close()
        return {"error": str(e)}

@app.get("/test-craft-types")
def test_craft_types():
    db = SessionLocal()
    try:
        craft_types = db.query(CraftType).all()
        result = []
        for ct in craft_types:
            # Count patterns for this craft type
            pattern_count = db.query(RequiresCraftType).filter(
                RequiresCraftType.craft_type_id == ct.craft_type_id
            ).count()
            result.append({
                "craft_type_id": ct.craft_type_id,
                "name": ct.name,
                "pattern_count": pattern_count
            })
        db.close()
        return {"craft_types": result}
    except Exception as e:
        db.close()
        return {"error": str(e)}

@app.get("/test-link-prices")
def test_link_prices():
    db = SessionLocal()
    try:
        # Get some sample patterns with their link prices
        links = db.query(HasLink_Link).limit(10).all()
        result = []
        for link in links:
            result.append({
                "pattern_id": link.pattern_id,
                "url": link.url,
                "price": link.price,
                "source": link.source
            })
        db.close()
        return {"links": result}
    except Exception as e:
        db.close()
        return {"error": str(e)}

@app.get("/test-specific-patterns")
def test_specific_patterns():
    db = SessionLocal()
    try:
        # Check specific patterns that were showing price 0.0
        pattern_ids = [167, 278, 296, 313, 332]
        result = []
        for pid in pattern_ids:
            # Get pattern info
            pattern = db.query(Pattern).filter(Pattern.pattern_id == pid).first()
            if pattern:
                # Get HasLink_Link entry
                link = db.query(HasLink_Link).filter(HasLink_Link.pattern_id == pid).first()
                result.append({
                    "pattern_id": pid,
                    "name": pattern.name,
                    "has_link_entry": link is not None,
                    "link_price": link.price if link else None,
                    "link_url": link.url if link else None
                })
        db.close()
        return {"patterns": result}
    except Exception as e:
        db.close()
        return {"error": str(e)}

@app.post("/upload-pdf/{pattern_id}")
async def upload_pdf(pattern_id: int, file: UploadFile = File(...)):
    """Upload a PDF file for a specific pattern"""
    db = SessionLocal()
    
    # Check if pattern exists
    pattern = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if not pattern:
        db.close()
        raise HTTPException(status_code=404, detail="Pattern not found")
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        db.close()
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"pattern_{pattern_id}_{secrets.token_hex(8)}{file_extension}"
    file_path = os.path.join(PDF_UPLOADS_DIR, unique_filename)
    
    try:
        # Save the file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Update pattern with Google Drive file ID
        pattern.google_drive_file_id = unique_filename
        db.commit()
        
        # Backup to cloud storage
        try:
            from cloud_storage import CloudStorage
            storage = CloudStorage()
            storage.backup_pdf(pattern_id, unique_filename, file_path)
        except Exception as cloud_error:
            print(f"Warning: Failed to backup PDF to cloud storage: {cloud_error}")
        
        db.close()
        return {"message": "PDF uploaded successfully", "filename": unique_filename}
    
    except Exception as e:
        db.close()
        # Clean up file if it was created
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to upload PDF: {str(e)}")

@app.get("/download-pdf/{pattern_id}")
async def download_pdf(pattern_id: int):
    """Download a PDF file for a specific pattern"""
    db = SessionLocal()
    
    # Check if pattern exists and has a PDF
    pattern = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if not pattern or not pattern.google_drive_file_id:
        db.close()
        raise HTTPException(status_code=404, detail="PDF not found for this pattern")
    
    # Check if this is a Google Drive file ID (doesn't contain file extension)
    if not pattern.google_drive_file_id.endswith('.pdf'):
        # This is a Google Drive file ID - redirect to Google Drive download
        google_drive_download_url = f"https://drive.google.com/uc?export=download&id={pattern.google_drive_file_id}"
        db.close()
        return {"redirect_url": google_drive_download_url}
    
    # This is a local file - handle as before
    file_path = os.path.join(PDF_UPLOADS_DIR, pattern.google_drive_file_id)
    
    # If file doesn't exist locally, try to restore from cloud storage
    if not os.path.exists(file_path):
        try:
            from cloud_storage import CloudStorage
            storage = CloudStorage()
            if storage.restore_pdf(pattern.google_drive_file_id, file_path):
                print(f"✅ Restored PDF from cloud storage: {pattern.google_drive_file_id}")
            else:
                db.close()
                raise HTTPException(status_code=404, detail="PDF file not found")
        except Exception as restore_error:
            print(f"Error restoring PDF: {restore_error}")
            db.close()
            raise HTTPException(status_code=404, detail="PDF file not found")
    
    db.close()
    return FileResponse(
        path=file_path,
        filename=pattern.google_drive_file_id,
        media_type='application/pdf'
    )

@app.get("/view-pdf/{pattern_id}")
async def view_pdf(pattern_id: int):
    """View a PDF file inline in the browser"""
    db = SessionLocal()
    
    # Check if pattern exists and has a PDF
    pattern = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if not pattern or not pattern.google_drive_file_id:
        db.close()
        raise HTTPException(status_code=404, detail="PDF not found for this pattern")
    
    # Check if this is a Google Drive file ID (doesn't contain file extension)
    if not pattern.google_drive_file_id.endswith('.pdf'):
        # This is a Google Drive file ID - redirect to Google Drive
        google_drive_url = f"https://drive.google.com/file/d/{pattern.google_drive_file_id}/view"
        db.close()
        return {"redirect_url": google_drive_url}
    
    # This is a local file - handle as before
    file_path = os.path.join(PDF_UPLOADS_DIR, pattern.google_drive_file_id)
    
    # If file doesn't exist locally, try to restore from cloud storage
    if not os.path.exists(file_path):
        try:
            from cloud_storage import CloudStorage
            storage = CloudStorage()
            if storage.restore_pdf(pattern.google_drive_file_id, file_path):
                print(f"✅ Restored PDF from cloud storage: {pattern.google_drive_file_id}")
            else:
                db.close()
                raise HTTPException(
                    status_code=404, 
                    detail="PDF file not found. Please re-upload the PDF file."
                )
        except Exception as restore_error:
            print(f"Error restoring PDF: {restore_error}")
            db.close()
            raise HTTPException(
                status_code=404, 
                detail="PDF file not found. Please re-upload the PDF file."
            )
    
    db.close()
    return FileResponse(
        path=file_path,
        media_type='application/pdf',
        headers={'Content-Disposition': 'inline'}
    )

@app.get("/debug/free-patterns")
def debug_free_patterns():
    db = SessionLocal()
    patterns = db.query(Pattern).all()
    result = []
    for pattern in patterns:
        # Get pattern link and price
        link_result = db.query(HasLink_Link.url, HasLink_Link.price).filter(
            HasLink_Link.pattern_id == pattern.pattern_id
        ).first()
        if link_result:
            link_price = link_result[1]
        else:
            link_price = None
        if link_price is None or link_price == 0 or link_price == 0.0:
            price_str = "Free"
        else:
            price_str = str(link_price)
        result.append({
            "pattern_id": pattern.pattern_id,
            "name": pattern.name,
            "link_price": link_price,
            "price_str": price_str
        })
    db.close()
    # Only return those marked as Free
    return [p for p in result if p["price_str"] == "Free"]

@app.get("/debug/patterns-yardage")
def debug_patterns_yardage():
    db = SessionLocal()
    try:
        # Get all patterns with their yardage info
        patterns = db.query(Pattern).all()
        result = []
        
        for pattern in patterns:
            # Get yarn weight and yardage/grams from PatternSuggestsYarn
            yarn_result = db.query(YarnType.weight, PatternSuggestsYarn.yardage_min, PatternSuggestsYarn.yardage_max, PatternSuggestsYarn.grams_min, PatternSuggestsYarn.grams_max).join(PatternSuggestsYarn).filter(
                PatternSuggestsYarn.pattern_id == pattern.pattern_id
            ).first()
            
            result.append({
                "pattern_id": pattern.pattern_id,
                "name": pattern.name,
                "has_yarn_info": yarn_result is not None,
                "weight": yarn_result[0] if yarn_result else None,
                "yardage_min": yarn_result[1] if yarn_result else None,
                "yardage_max": yarn_result[2] if yarn_result else None,
                "grams_min": yarn_result[3] if yarn_result else None,
                "grams_max": yarn_result[4] if yarn_result else None
            })
        
        db.close()
        return {"patterns": result}
    except Exception as e:
        db.close()
        return {"error": str(e)}

@app.get("/patterns/stash-match/{user_id}", response_model=PaginatedPatternResponse)
def get_stash_matching_patterns(
    user_id: int,
    page: int = 1,
    page_size: int = 30,
    uploaded_only: Optional[bool] = None,
    project_type: Optional[str] = None,
    craft_type: Optional[str] = None,
    weight: Optional[str] = None,
    designer: Optional[str] = None,
    free_only: Optional[bool] = None
):
    print(f"[DEBUG] stash-match params: user_id={user_id}, page={page}, page_size={page_size}, uploaded_only={uploaded_only}, project_type={project_type}, craft_type={craft_type}, weight={weight}, designer={designer}, free_only={free_only}")
    
    # Validate pagination parameters
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 30
    if page_size > 100000:
        page_size = 100000
    
    db = SessionLocal()
    
    # Get user's yarn stash
    stash_query = db.query(OwnsYarn, YarnType).join(YarnType).filter(OwnsYarn.user_id == user_id)
    stash_items = stash_query.all()
    
    if not stash_items:
        db.close()
        return PaginatedPatternResponse(
            patterns=[],
            pagination={
                "page": page,
                "page_size": page_size,
                "total": 0,
                "pages": 0,
                "has_next": False,
                "has_prev": False
            }
        )
    
    # Calculate total yardage by weight class (same as frontend)
    stash_yardage_by_weight = {}
    for stash_item, yarn_type in stash_items:
        weight_key = yarn_type.weight
        if weight_key not in stash_yardage_by_weight:
            stash_yardage_by_weight[weight_key] = 0
        stash_yardage_by_weight[weight_key] += stash_item.yardage
    
    print(f"[DEBUG] stash-match stash yardage by weight: {stash_yardage_by_weight}")
    
    # Frontend weight mapping logic (exact copy from PatternCard.tsx)
    def get_weight_mapping():
        return {
            'lace': ['Lace'],
            'cobweb': ['Cobweb'],
            'thread': ['Thread'],
            'light-fingering': ['Light Fingering'],
            'fingering': ['Fingering (14 wpi)', 'Fingering'],
            'sport': ['Sport (12 wpi)', 'Sport'],
            'dk': ['DK (11 wpi)', 'DK'],
            'worsted': ['Worsted (9 wpi)', 'Worsted'],
            'aran': ['Aran (8 wpi)', 'Aran'],
            'bulky': ['Bulky (7 wpi)', 'Bulky'],
            'super-bulky': ['Super Bulky (5-6 wpi)', 'Super Bulky'],
            'jumbo': ['Jumbo (0-4 wpi)', 'Jumbo'],
            # Add full weight strings as keys for direct lookup
            'Lace': ['Lace'],
            'Cobweb': ['Cobweb'],
            'Thread': ['Thread'],
            'Light Fingering': ['Light Fingering'],
            'Fingering (14 wpi)': ['Fingering (14 wpi)', 'Fingering'],
            'Sport (12 wpi)': ['Sport (12 wpi)', 'Sport'],
            'DK (11 wpi)': ['DK (11 wpi)', 'DK'],
            'Worsted (9 wpi)': ['Worsted (9 wpi)', 'Worsted'],
            'Aran (8 wpi)': ['Aran (8 wpi)', 'Aran'],
            'Bulky (7 wpi)': ['Bulky (7 wpi)', 'Bulky'],
            'Super Bulky (5-6 wpi)': ['Super Bulky (5-6 wpi)', 'Super Bulky'],
            'Jumbo (0-4 wpi)': ['Jumbo (0-4 wpi)', 'Jumbo']
        }
    
    # Held yarn weight calculations (exact copy from frontend)
    def get_held_yarn_calculations():
        return {
            'thread': [
                {'weight': 'Lace', 'description': '2 strands of thread = Lace weight'}
            ],
            'lace': [
                {'weight': 'Fingering (14 wpi)', 'description': '2 strands of lace = Fingering to Sport weight'},
                {'weight': 'Sport (12 wpi)', 'description': '2 strands of lace = Fingering to Sport weight'}
            ],
            'fingering': [
                {'weight': 'DK (11 wpi)', 'description': '2 strands of fingering = DK weight'}
            ],
            'sport': [
                {'weight': 'DK (11 wpi)', 'description': '2 strands of sport = DK or Light Worsted'},
                {'weight': 'Worsted (9 wpi)', 'description': '2 strands of sport = DK or Light Worsted'}
            ],
            'dk': [
                {'weight': 'Worsted (9 wpi)', 'description': '2 strands of DK = Worsted or Aran'},
                {'weight': 'Aran (8 wpi)', 'description': '2 strands of DK = Worsted or Aran'}
            ],
            'worsted': [
                {'weight': 'Bulky (7 wpi)', 'description': '2 strands of Worsted = Chunky'}
            ],
            'aran': [
                {'weight': 'Bulky (7 wpi)', 'description': '2 strands of Aran = Chunky to Super Bulky'},
                {'weight': 'Super Bulky (5-6 wpi)', 'description': '2 strands of Aran = Chunky to Super Bulky'}
            ],
            'bulky': [
                {'weight': 'Super Bulky (5-6 wpi)', 'description': '2 strands of Chunky = Super Bulky to Jumbo'},
                {'weight': 'Jumbo (0-4 wpi)', 'description': '2 strands of Chunky = Super Bulky to Jumbo'}
            ]
        }
    
    def normalize_weight(weight_str):
        """Normalize weight strings for comparison"""
        import re
        return re.sub(r'\s*\(\d+\s*wpi\)', '', weight_str.lower())
    
    def check_weight_match(stash_weight, pattern_weight):
        """Check if a weight matches (including held yarn calculations)"""
        stash_normalized = normalize_weight(stash_weight)
        pattern_normalized = normalize_weight(pattern_weight)
        
        # Direct match
        if stash_normalized == pattern_normalized:
            return {'matches': True}
        
        # Check weight mapping
        weight_mapping = get_weight_mapping()
        possible_pattern_weights = [normalize_weight(w) for w in (weight_mapping.get(stash_weight, []) + weight_mapping.get(stash_weight.lower(), []))]
        if pattern_normalized in possible_pattern_weights:
            return {'matches': True}
        
        # Check reverse mapping
        possible_stash_weights = [normalize_weight(w) for w in (weight_mapping.get(pattern_weight, []) + weight_mapping.get(pattern_weight.lower(), []))]
        if stash_normalized in possible_stash_weights:
            return {'matches': True}
        
        # Check held yarn calculations
        held_calculations = get_held_yarn_calculations()
        held_calcs = held_calculations.get(stash_normalized, [])
        for calc in held_calcs:
            if normalize_weight(calc['weight']) == pattern_normalized:
                return {'matches': True, 'description': calc['description']}
        
        # Check partial matching for cases like "fingering" vs "Fingering (14 wpi)"
        if stash_normalized in pattern_normalized or pattern_normalized in stash_normalized:
            return {'matches': True}
        
        return {'matches': False}
    
    weight_mapping = get_weight_mapping()
    
    # Get all patterns with yarn suggestions
    patterns_query = db.query(
        Pattern.pattern_id,
        Pattern.name,
        Pattern.designer,
        Pattern.image,
        Pattern.google_drive_file_id,
        YarnType.weight.label('required_weight'),
        PatternSuggestsYarn.yardage_min,
        PatternSuggestsYarn.yardage_max,
        CraftType.name.label('craft_type_name'),
        ProjectType.name.label('project_type_name'),
        HasLink_Link.url,
        HasLink_Link.price
    ).join(
        PatternSuggestsYarn, Pattern.pattern_id == PatternSuggestsYarn.pattern_id
    ).join(
        YarnType, PatternSuggestsYarn.yarn_id == YarnType.yarn_id
    ).outerjoin(
        RequiresCraftType, Pattern.pattern_id == RequiresCraftType.pattern_id
    ).outerjoin(
        CraftType, RequiresCraftType.craft_type_id == CraftType.craft_type_id
    ).outerjoin(
        SuitableFor, Pattern.pattern_id == SuitableFor.pattern_id
    ).outerjoin(
        ProjectType, SuitableFor.project_type_id == ProjectType.project_type_id
    ).outerjoin(
        HasLink_Link, Pattern.pattern_id == HasLink_Link.pattern_id
    )
    
    # Apply filters before matching
    if uploaded_only:
        patterns_query = patterns_query.join(OwnsPattern).filter(OwnsPattern.user_id == user_id)
    
    if project_type and project_type != 'any':
        db_project_type = map_frontend_project_type_to_db(project_type)
        patterns_query = patterns_query.filter(ProjectType.name == db_project_type)
    
    if craft_type and craft_type != 'any':
        patterns_query = patterns_query.filter(CraftType.name == craft_type)
    
    if weight and weight != 'any':
        # Map frontend weight to database weight format
        weight_mapping_frontend = {
            'lace': 'Lace',
            'cobweb': 'Cobweb', 
            'thread': 'Thread',
            'light-fingering': 'Light Fingering',
            'fingering': 'Fingering (14 wpi)',
            'sport': 'Sport (12 wpi)',
            'dk': 'DK (11 wpi)',
            'worsted': 'Worsted (9 wpi)',
            'aran': 'Aran (8 wpi)',
            'bulky': 'Bulky (7 wpi)',
            'super-bulky': 'Super Bulky (5-6 wpi)',
            'jumbo': 'Jumbo (0-4 wpi)'
        }
        db_weight = weight_mapping_frontend.get(weight, weight)
        patterns_query = patterns_query.filter(YarnType.weight == db_weight)
    
    if designer and designer.strip():
        patterns_query = patterns_query.filter(Pattern.designer.ilike(f'%{designer}%'))
    
    if free_only:
        patterns_query = patterns_query.filter(
            (HasLink_Link.price.ilike('free')) |
            (HasLink_Link.price == '0') |
            (HasLink_Link.price == '0.0') |
            (HasLink_Link.price.ilike('$0.00')) |
            (HasLink_Link.price.ilike('0.0 gbp')) |
            (HasLink_Link.price.ilike('0.0 dkk')) |
            (HasLink_Link.price.ilike('0.0 usd'))
        )
    
    # Get all patterns
    all_patterns = patterns_query.all()
    print(f"[DEBUG] stash-match total patterns before matching: {len(all_patterns)}")
    
    # Apply frontend matching logic to each pattern
    matching_patterns = []
    for result in all_patterns:
        if not result.required_weight:
            continue  # Skip patterns without weight info (same as frontend)
        
        # Frontend matching logic (exact copy from PatternCard.tsx matchesStash function)
        matching_yarns = []
        match_description = ''
        for stash_weight, stash_yardage in stash_yardage_by_weight.items():
            # Use the new held yarn calculation logic
            weight_check = check_weight_match(stash_weight, result.required_weight)
            if weight_check['matches']:
                matching_yarns.append((stash_weight, stash_yardage))
                if 'description' in weight_check:
                    match_description = weight_check['description']
        
        if not matching_yarns:
            continue  # No matching yarn weight
        
        # Calculate total yardage for matching yarns
        total_yardage = sum(yardage for _, yardage in matching_yarns)
        
        if total_yardage == 0:
            continue  # No yarn in this weight class
        
        # Handle different yardage scenarios (same as frontend)
        has_min_yardage = result.yardage_min is not None
        has_max_yardage = result.yardage_max is not None
        
        matches = False
        if has_min_yardage and has_max_yardage:
            # Both min and max yardage - stash must be at least as much as max
            matches = total_yardage >= result.yardage_max
        elif has_min_yardage:
            # Only min yardage - stash must have at least this much
            matches = total_yardage >= result.yardage_min
        elif has_max_yardage:
            # Only max yardage - stash must be at least as much as max
            matches = total_yardage >= result.yardage_max
        else:
            # No yardage info - can't determine if stash matches (same as frontend)
            continue
        
        if matches:
            matching_patterns.append(PatternResponse(
                pattern_id=result.pattern_id,
                name=result.name,
                designer=result.designer,
                image=result.image if result.image is not None else "/placeholder.svg",
                google_drive_file_id=result.google_drive_file_id,
                yardage_min=result.yardage_min,
                yardage_max=result.yardage_max,
                grams_min=None,
                grams_max=None,
                project_type=result.project_type_name,
                craft_type=result.craft_type_name,
                required_weight=result.required_weight,
                pattern_url=result.url,
                price=result.price,
                held_yarn_description=match_description if match_description else None
            ))
    
    print(f"[DEBUG] stash-match patterns matching stash: {len(matching_patterns)}")
    
    # Deduplicate by pattern_id
    seen_pattern_ids = set()
    unique_matching_patterns = []
    for pattern in matching_patterns:
        if pattern.pattern_id not in seen_pattern_ids:
            seen_pattern_ids.add(pattern.pattern_id)
            unique_matching_patterns.append(pattern)
    
    # Apply pagination
    total_matching = len(unique_matching_patterns)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_patterns = unique_matching_patterns[start_idx:end_idx]
    
    db.close()
    
    # Calculate pagination info
    total_pages = (total_matching + page_size - 1) // page_size
    
    return PaginatedPatternResponse(
        patterns=paginated_patterns,
        pagination={
            "page": page,
            "page_size": page_size,
            "total": total_matching,
            "pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    )

def map_frontend_project_type_to_db(frontend_value):
    """Map frontend project type values to database values"""
    mapping = {
        'mittens-gloves': 'Mittens/Gloves',
        'shawl-wrap': 'Shawl/Wrap',
        'tank-camisole': 'Tank/Camisole',
        'dress-suit': 'Dress/Suit',
        'child': 'Child',
        'hat': 'Hat',
        'baby': 'Baby',
        'socks': 'Socks',
        'scarf': 'Scarf',
        'home': 'Home',
        'pullover': 'Pullover',
        'toys': 'Toys',
        'pet': 'Pet',
        'other': 'Other',
        'shrug': 'Shrug',
        'blanket': 'Blanket',
        'cardigan': 'Cardigan',
        'vest': 'Vest',
        'tee': 'Tee',
        'jacket': 'Jacket',
        'bag': 'Bag',
        'skirt': 'Skirt',
        'dishcloth': 'Dishcloth'
    }
    return mapping.get(frontend_value, frontend_value)

def get_compatible_weights(pattern_weight):
    """Return list of compatible yarn weights for substitution"""
    weight_mapping = {
        # Light Fingering can be substituted with Fingering
        "light fingering": ["fingering (14 wpi)", "fingering"],
        # Fingering can be substituted with Light Fingering and each other
        "fingering (14 wpi)": ["light fingering", "fingering"],
        "fingering": ["light fingering", "fingering (14 wpi)"],
        # Sport can be substituted with DK or Fingering
        "sport": ["dk", "worsted (9 wpi)", "fingering (14 wpi)", "fingering"],
        # DK can be substituted with Sport or Worsted
        "dk": ["sport", "worsted (9 wpi)", "worsted"],
        # Worsted can be substituted with DK or Aran
        "worsted (9 wpi)": ["dk", "aran", "worsted"],
        "worsted": ["dk", "aran", "worsted (9 wpi)"],
        # Aran can be substituted with Worsted or Bulky
        "aran": ["worsted (9 wpi)", "worsted", "bulky"],
        # Bulky can be substituted with Aran or Super Bulky
        "bulky": ["aran", "super bulky"],
        # Super Bulky can be substituted with Bulky
        "super bulky": ["bulky"]
    }
    return weight_mapping.get(pattern_weight, [])

@app.get("/users/{user_id}/yarn")
@app.get("/users/{user_id}/yarn/")
def get_user_yarn(user_id: int):
    db = SessionLocal()
    try:
        stash_query = db.query(OwnsYarn, YarnType).join(YarnType).filter(OwnsYarn.user_id == user_id)
        stash_items = stash_query.all()
        
        result = []
        for stash_item, yarn_type in stash_items:
            result.append({
                "yarn_id": yarn_type.yarn_id,
                "yarn_name": yarn_type.yarn_name,
                "brand": yarn_type.brand,
                "weight": yarn_type.weight,
                "fiber": yarn_type.fiber,
                "yardage": stash_item.yardage,
                "grams": stash_item.grams
            })
        
        db.close()
        return {"yarn": result}
    except Exception as e:
        db.close()
        return {"error": str(e)}

@app.get("/debug/yarn-types")
def debug_yarn_types():
    db = SessionLocal()
    try:
        yarn_types = db.query(YarnType).limit(10).all()
        result = []
        for yt in yarn_types:
            result.append({
                "yarn_id": yt.yarn_id,
                "yarn_name": yt.yarn_name,
                "brand": yt.brand,
                "weight": yt.weight,
                "fiber": yt.fiber
            })
        db.close()
        return {"yarn_types": result}
    except Exception as e:
        db.close()
        return {"error": str(e)}

@app.get("/debug/user-patterns/{user_id}")
def debug_user_patterns(user_id: int):
    db = SessionLocal()
    
    # Get patterns owned by the user
    user_patterns = db.query(Pattern).join(OwnsPattern).filter(OwnsPattern.user_id == user_id).all()
    
    result = []
    for pattern in user_patterns:
        # Get yarn weight and yardage/grams from PatternSuggestsYarn
        yarn_result = db.query(YarnType.weight, PatternSuggestsYarn.yardage_min, PatternSuggestsYarn.yardage_max, PatternSuggestsYarn.grams_min, PatternSuggestsYarn.grams_max).join(PatternSuggestsYarn).filter(
            PatternSuggestsYarn.pattern_id == pattern.pattern_id
        ).first()
        
        # Check if PDF file exists on disk
        pdf_exists = False
        if pattern.google_drive_file_id:
            file_path = os.path.join(PDF_UPLOADS_DIR, pattern.google_drive_file_id)
            pdf_exists = os.path.exists(file_path)
        
        result.append({
            "pattern_id": pattern.pattern_id,
            "name": pattern.name,
            "designer": pattern.designer,
            "yarn_weight": yarn_result[0] if yarn_result else None,
            "yardage_min": yarn_result[1] if yarn_result else None,
            "yardage_max": yarn_result[2] if yarn_result else None,
            "grams_min": yarn_result[3] if yarn_result else None,
            "grams_max": yarn_result[4] if yarn_result else None,
            "has_yarn_data": yarn_result is not None,
            "google_drive_file_id": pattern.google_drive_file_id,
            "has_pdf": pattern.google_drive_file_id is not None,
            "pdf_exists_on_disk": pdf_exists
        })
    
    db.close()
    return result

@app.get("/debug/pdf-uploads")
def debug_pdf_uploads():
    """Debug endpoint to check PDF uploads directory"""
    try:
        # Check if directory exists
        dir_exists = os.path.exists(PDF_UPLOADS_DIR)
        
        # List files in directory
        files = []
        if dir_exists:
            files = os.listdir(PDF_UPLOADS_DIR)
        
        # Get current working directory
        cwd = os.getcwd()
        
        return {
            "pdf_uploads_dir": PDF_UPLOADS_DIR,
            "dir_exists": dir_exists,
            "files": files,
            "file_count": len(files),
            "current_working_directory": cwd,
            "absolute_path": os.path.abspath(PDF_UPLOADS_DIR)
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/restore-pdfs")
def restore_all_pdfs():
    """Restore all PDFs from cloud storage"""
    try:
        from cloud_storage import CloudStorage
        storage = CloudStorage()
        restored_count = storage.restore_all_pdfs()
        return {"message": f"Restored {restored_count} PDFs from cloud storage"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restore PDFs: {str(e)}")

@app.post("/backup-pdfs")
def backup_all_pdfs():
    """Backup all PDFs to cloud storage"""
    try:
        from cloud_storage import CloudStorage
        storage = CloudStorage()
        backed_up_count = storage.backup_all_pdfs()
        return {"message": f"Backed up {backed_up_count} PDFs to cloud storage"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to backup PDFs: {str(e)}")

@app.get("/debug/project-types")
def debug_project_types():
    """Debug endpoint to check project types in database"""
    db = SessionLocal()
    try:
        # Get all project types
        project_types = db.query(ProjectType).all()
        
        # Get count of patterns for each project type
        result = []
        for pt in project_types:
            pattern_count = db.query(SuitableFor).filter(SuitableFor.project_type_id == pt.project_type_id).count()
            result.append({
                "project_type_id": pt.project_type_id,
                "name": pt.name,
                "pattern_count": pattern_count
            })
        
        db.close()
        return {
            "project_types": result,
            "total_project_types": len(result)
        }
    except Exception as e:
        db.close()
        return {"error": str(e)}

@app.get("/debug/patterns-by-project-type")
def debug_patterns_by_project_type():
    """Debug endpoint to check patterns by project type"""
    db = SessionLocal()
    try:
        # Get patterns with their project types
        patterns = db.query(
            Pattern.pattern_id,
            Pattern.name,
            ProjectType.name.label('project_type_name')
        ).outerjoin(
            SuitableFor, Pattern.pattern_id == SuitableFor.pattern_id
        ).outerjoin(
            ProjectType, SuitableFor.project_type_id == ProjectType.project_type_id
        ).limit(50).all()
        
        result = []
        for pattern in patterns:
            result.append({
                "pattern_id": pattern.pattern_id,
                "name": pattern.name,
                "project_type": pattern.project_type_name
            })
        
        db.close()
        return {
            "patterns": result,
            "total_patterns": len(result)
        }
    except Exception as e:
        db.close()
        return {"error": str(e)}

@app.put("/users/{user_id}/yarn/{yarn_id}")
def update_yarn(user_id: int, yarn_id: str, yarn: YarnCreate):
    db = SessionLocal()
    
    # Check if user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if the yarn exists in user's stash
    owns_yarn = db.query(OwnsYarn).filter(
        OwnsYarn.user_id == user_id,
        OwnsYarn.yarn_id == yarn_id
    ).first()
    
    if not owns_yarn:
        db.close()
        raise HTTPException(status_code=404, detail="Yarn not found in user's stash")
    
    # Update the yarn amounts
    owns_yarn.yardage = yarn.yardage
    owns_yarn.grams = yarn.grams
    
    db.commit()
    db.close()
    
    return {"message": "Yarn updated successfully"}

# Favorites endpoints
@app.post("/users/{user_id}/favorites/{pattern_id}/")
def add_favorite(user_id: int, pattern_id: int):
    db = SessionLocal()
    
    # Check if user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if pattern exists
    pattern = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if not pattern:
        db.close()
        raise HTTPException(status_code=404, detail="Pattern not found")
    
    # Check if already favorited
    existing_favorite = db.query(FavoritePattern).filter(
        FavoritePattern.user_id == user_id,
        FavoritePattern.pattern_id == pattern_id
    ).first()
    if existing_favorite:
        db.close()
        raise HTTPException(status_code=400, detail="Pattern already favorited")
    
    # Add to favorites
    favorite = FavoritePattern(user_id=user_id, pattern_id=pattern_id)
    db.add(favorite)
    db.commit()
    db.close()
    
    return {"message": "Pattern added to favorites"}

@app.delete("/users/{user_id}/favorites/{pattern_id}/")
def remove_favorite(user_id: int, pattern_id: int):
    db = SessionLocal()
    
    # Check if user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if pattern exists
    pattern = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if not pattern:
        db.close()
        raise HTTPException(status_code=404, detail="Pattern not found")
    
    # Check if favorited
    favorite = db.query(FavoritePattern).filter(
        FavoritePattern.user_id == user_id,
        FavoritePattern.pattern_id == pattern_id
    ).first()
    if not favorite:
        db.close()
        raise HTTPException(status_code=404, detail="Pattern not in favorites")
    
    # Remove from favorites
    db.delete(favorite)
    db.commit()
    db.close()
    
    return {"message": "Pattern removed from favorites"}

@app.get("/users/{user_id}/favorites", response_model=PaginatedPatternResponse)
@app.get("/users/{user_id}/favorites/", response_model=PaginatedPatternResponse)
def get_user_favorites(
    user_id: int,
    page: int = 1,
    page_size: int = 30
):
    # Validate pagination parameters
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 30
    if page_size > 100000:
        page_size = 100000
    
    db = SessionLocal()
    
    # Check if user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get favorited patterns
    favorites_query = db.query(Pattern).join(FavoritePattern).filter(
        FavoritePattern.user_id == user_id
    )
    
    # Count total
    total_count = favorites_query.count()
    
    # Apply pagination
    result = favorites_query.offset((page - 1) * page_size).limit(page_size).all()
    
    # Build response with related data
    patterns_response = []
    for pattern in result:
        # Get craft type
        craft_type_result = db.query(CraftType.name).join(RequiresCraftType).filter(
            RequiresCraftType.pattern_id == pattern.pattern_id
        ).first()
        craft_type_name = craft_type_result[0] if craft_type_result else None
        
        # Get project type
        project_type_result = db.query(ProjectType.name).join(SuitableFor).filter(
            SuitableFor.pattern_id == pattern.pattern_id
        ).first()
        project_type_name = project_type_result[0] if project_type_result else None
        
        # Get yarn info
        yarn_result = db.query(YarnType.weight, PatternSuggestsYarn.yardage_min, PatternSuggestsYarn.yardage_max).join(PatternSuggestsYarn).filter(
            PatternSuggestsYarn.pattern_id == pattern.pattern_id
        ).first()
        
        pattern_weight = None
        yardage_min = None
        yardage_max = None
        if yarn_result:
            pattern_weight = yarn_result[0].lower() if yarn_result[0] else None
            yardage_min = yarn_result[1]
            yardage_max = yarn_result[2]
        
        # Get pattern link and price
        link_result = db.query(HasLink_Link.url, HasLink_Link.price).filter(
            HasLink_Link.pattern_id == pattern.pattern_id
        ).first()
        
        if link_result:
            pattern_url = link_result[0]
            price_value = link_result[1]
            if price_value is not None:
                if price_value.lower() == 'free' or price_value == '0' or price_value == '0.0':
                    price_display = "Free"
                else:
                    price_display = price_value
            else:
                price_display = None
        else:
            pattern_url = None
            price_display = None
        
        patterns_response.append(PatternResponse(
            pattern_id=pattern.pattern_id,
            name=pattern.name,
            designer=pattern.designer,
            image=pattern.image if pattern.image is not None else "/placeholder.svg",
            google_drive_file_id=pattern.google_drive_file_id,
            yardage_min=yardage_min,
            yardage_max=yardage_max,
            grams_min=None,
            grams_max=None,
            project_type=project_type_name,
            craft_type=craft_type_name,
            required_weight=pattern_weight,
            pattern_url=pattern_url,
            price=price_display
        ))
    
    db.close()
    
    # Calculate pagination info
    total_pages = (total_count + page_size - 1) // page_size
    
    return PaginatedPatternResponse(
        patterns=patterns_response,
        pagination={
            "page": page,
            "page_size": page_size,
            "total": total_count,
            "pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    )

@app.get("/users/{user_id}/favorites/{pattern_id}/check/")
def check_favorite(user_id: int, pattern_id: int):
    db = SessionLocal()
    
    # Check if user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if pattern exists
    pattern = db.query(Pattern).filter(Pattern.pattern_id == pattern_id).first()
    if not pattern:
        db.close()
        raise HTTPException(status_code=404, detail="Pattern not found")
    
    # Check if favorited
    favorite = db.query(FavoritePattern).filter(
        FavoritePattern.user_id == user_id,
        FavoritePattern.pattern_id == pattern_id
    ).first()
    
    db.close()
    
    return {"is_favorited": favorite is not None}

@app.get("/patterns/random", response_model=List[PatternResponse])
@app.get("/patterns/random/", response_model=List[PatternResponse])
def get_random_patterns():
    db = SessionLocal()
    try:
        all_patterns = db.query(Pattern).all()
        if len(all_patterns) <= 3:
            selected_patterns = all_patterns
        else:
            selected_patterns = random.sample(all_patterns, 3)
        result = []
        for pattern in selected_patterns:
            # Get craft type
            craft_type_result = db.query(CraftType.name).join(RequiresCraftType).filter(
                RequiresCraftType.pattern_id == pattern.pattern_id
            ).first()
            craft_type_name = craft_type_result[0] if craft_type_result else None

            # Get project type
            project_type_result = db.query(ProjectType.name).join(SuitableFor).filter(
                SuitableFor.pattern_id == pattern.pattern_id
            ).first()
            project_type_name = project_type_result[0] if project_type_result else None

            # Get yarn weight and yardage/grams from PatternSuggestsYarn
            yarn_result = db.query(YarnType.weight, PatternSuggestsYarn.yardage_min, PatternSuggestsYarn.yardage_max, PatternSuggestsYarn.grams_min, PatternSuggestsYarn.grams_max).join(PatternSuggestsYarn).filter(
                PatternSuggestsYarn.pattern_id == pattern.pattern_id
            ).first()
            yarn_weight = yarn_result[0] if yarn_result else None
            yardage_min = yarn_result[1] if yarn_result else None
            yardage_max = yarn_result[2] if yarn_result else None
            grams_min = yarn_result[3] if yarn_result else None
            grams_max = yarn_result[4] if yarn_result else None

            # Get pattern link and price
            link_result = db.query(HasLink_Link.url, HasLink_Link.price).filter(
                HasLink_Link.pattern_id == pattern.pattern_id
            ).first()
            if link_result:
                pattern_url = link_result[0]
                price_value = link_result[1]
                if price_value is not None:
                    if str(price_value).lower() == 'free' or str(price_value) == '0' or str(price_value) == '0.0':
                        price_display = "Free"
                    else:
                        price_display = price_value
                else:
                    price_display = None
            else:
                pattern_url = None
                price_display = None

            result.append(PatternResponse(
                pattern_id=pattern.pattern_id,
                name=pattern.name,
                designer=pattern.designer,
                image=pattern.image if pattern.image is not None else "/placeholder.svg",
                google_drive_file_id=pattern.google_drive_file_id,
                yardage_min=yardage_min,
                yardage_max=yardage_max,
                grams_min=grams_min,
                grams_max=grams_max,
                project_type=project_type_name,
                craft_type=craft_type_name,
                required_weight=yarn_weight,
                pattern_url=pattern_url,
                price=price_display
            ))
        db.close()
        return result
    except Exception as e:
        db.close()
        raise HTTPException(status_code=500, detail=f"Failed to get random patterns: {str(e)}")

@app.delete("/users/{user_id}/yarn/{yarn_id}")
def delete_user_yarn(user_id: int, yarn_id: str):
    db = SessionLocal()
    try:
        # Check if user exists
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            db.close()
            raise HTTPException(status_code=404, detail="User not found")

        # Check if the user owns this yarn
        owns_yarn = db.query(OwnsYarn).filter(
            OwnsYarn.user_id == user_id,
            OwnsYarn.yarn_id == yarn_id
        ).first()
        if not owns_yarn:
            db.close()
            raise HTTPException(status_code=404, detail="Yarn not found in user's stash")

        # Delete the ownership relationship
        db.delete(owns_yarn)
        db.commit()
        db.close()
        return {"message": "Yarn removed from stash"}
    except Exception as e:
        db.rollback()
        db.close()
        raise HTTPException(status_code=500, detail=f"Error deleting yarn: {str(e)}")

# To run: uvicorn app:app --reload