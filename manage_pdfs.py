#!/usr/bin/env python3
"""
Comprehensive PDF management for StitchMatch
Handles backup, restore, and synchronization of PDF files
"""

import sqlite3
import requests
import json
import os
import shutil
from datetime import datetime
from pathlib import Path

# Configuration
LOCAL_DB_PATH = "StitchMatch.db"
RAILWAY_API_URL = "https://web-production-e76a.up.railway.app"
BACKUP_DIR = "pdf_backup"
PDF_UPLOADS_DIR = "pdf_uploads"

def get_local_pdfs():
    """Get all patterns with PDFs from local database"""
    conn = sqlite3.connect(LOCAL_DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT pattern_id, name, designer, pdf_file 
        FROM Pattern 
        WHERE pdf_file IS NOT NULL AND pdf_file != ''
    """)
    
    patterns = cursor.fetchall()
    conn.close()
    
    return patterns

def get_railway_pdfs():
    """Get all patterns with PDFs from Railway"""
    try:
        response = requests.get(f"{RAILWAY_API_URL}/patterns?page_size=1000")
        if response.status_code == 200:
            data = response.json()
            patterns = data["patterns"]
            return [p for p in patterns if p.get("pdf_file")]
        else:
            print(f"❌ Failed to get patterns from Railway: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Error getting Railway patterns: {e}")
        return []

def create_backup():
    """Create a complete backup of PDFs and metadata"""
    print("📁 Creating PDF backup...")
    
    # Create backup directory
    if os.path.exists(BACKUP_DIR):
        shutil.rmtree(BACKUP_DIR)
    os.makedirs(BACKUP_DIR)
    
    # Get patterns with PDFs
    patterns = get_local_pdfs()
    
    if not patterns:
        print("❌ No patterns with PDFs found")
        return None
    
    print(f"📊 Found {len(patterns)} patterns with PDFs")
    
    # Create metadata
    metadata = {
        "backup_date": datetime.now().isoformat(),
        "total_patterns": len(patterns),
        "patterns": []
    }
    
    # Copy files and record metadata
    copied_count = 0
    
    for pattern_id, name, designer, pdf_file in patterns:
        source_path = os.path.join(PDF_UPLOADS_DIR, pdf_file)
        dest_path = os.path.join(BACKUP_DIR, pdf_file)
        
        if os.path.exists(source_path):
            try:
                shutil.copy2(source_path, dest_path)
                copied_count += 1
                
                metadata["patterns"].append({
                    "pattern_id": pattern_id,
                    "name": name,
                    "designer": designer,
                    "pdf_file": pdf_file,
                    "file_size": os.path.getsize(source_path),
                    "backed_up": True
                })
                
                print(f"✅ Backed up: {name} (ID: {pattern_id})")
                
            except Exception as e:
                print(f"❌ Failed to backup {name}: {e}")
                metadata["patterns"].append({
                    "pattern_id": pattern_id,
                    "name": name,
                    "designer": designer,
                    "pdf_file": pdf_file,
                    "backed_up": False,
                    "error": str(e)
                })
        else:
            print(f"⚠️  PDF file not found: {pdf_file}")
            metadata["patterns"].append({
                "pattern_id": pattern_id,
                "name": name,
                "designer": designer,
                "pdf_file": pdf_file,
                "backed_up": False,
                "error": "File not found"
            })
    
    # Save metadata
    metadata_path = os.path.join(BACKUP_DIR, "metadata.json")
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n🎉 Backup completed!")
    print(f"📄 Files copied: {copied_count}/{len(patterns)}")
    
    return metadata

def restore_from_backup():
    """Restore PDFs from backup"""
    print("📁 Restoring PDFs from backup...")
    
    if not os.path.exists(BACKUP_DIR):
        print(f"❌ Backup directory not found: {BACKUP_DIR}")
        return
    
    metadata_path = os.path.join(BACKUP_DIR, "metadata.json")
    if not os.path.exists(metadata_path):
        print(f"❌ Metadata file not found: {metadata_path}")
        return
    
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
    
    # Create pdf_uploads directory
    os.makedirs(PDF_UPLOADS_DIR, exist_ok=True)
    
    # Restore files
    restored_count = 0
    total_patterns = len(metadata["patterns"])
    
    for pattern in metadata["patterns"]:
        if pattern.get("backed_up", False):
            source_path = os.path.join(BACKUP_DIR, pattern["pdf_file"])
            dest_path = os.path.join(PDF_UPLOADS_DIR, pattern["pdf_file"])
            
            if os.path.exists(source_path):
                try:
                    shutil.copy2(source_path, dest_path)
                    restored_count += 1
                    print(f"✅ Restored: {pattern['name']} (ID: {pattern['pattern_id']})")
                except Exception as e:
                    print(f"❌ Failed to restore {pattern['name']}: {e}")
            else:
                print(f"⚠️  Backup file not found: {pattern['pdf_file']}")
        else:
            print(f"⚠️  Skipping {pattern['name']}: {pattern.get('error', 'Not backed up')}")
    
    print(f"\n🎉 Restoration completed!")
    print(f"📄 Files restored: {restored_count}/{total_patterns}")

def sync_to_railway():
    """Sync PDFs to Railway"""
    print("☁️  Syncing PDFs to Railway...")
    
    if not os.path.exists(BACKUP_DIR):
        print(f"❌ Backup directory not found: {BACKUP_DIR}")
        return
    
    metadata_path = os.path.join(BACKUP_DIR, "metadata.json")
    if not os.path.exists(metadata_path):
        print(f"❌ Metadata file not found: {metadata_path}")
        return
    
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
    
    # Get current Railway PDFs
    railway_pdfs = get_railway_pdfs()
    railway_pattern_ids = {p["pattern_id"] for p in railway_pdfs}
    
    print(f"📊 Found {len(railway_pdfs)} existing PDFs on Railway")
    
    # Upload missing PDFs
    uploaded_count = 0
    total_patterns = len(metadata["patterns"])
    
    for pattern in metadata["patterns"]:
        if pattern.get("backed_up", False) and pattern["pattern_id"] not in railway_pattern_ids:
            pdf_file_path = os.path.join(BACKUP_DIR, pattern["pdf_file"])
            
            if os.path.exists(pdf_file_path):
                try:
                    with open(pdf_file_path, 'rb') as f:
                        files = {'file': (pattern["pdf_file"], f, 'application/pdf')}
                        response = requests.post(f"{RAILWAY_API_URL}/upload-pdf/{pattern['pattern_id']}", files=files)
                        
                        if response.status_code == 200:
                            uploaded_count += 1
                            print(f"✅ Uploaded: {pattern['name']} (ID: {pattern['pattern_id']})")
                        else:
                            print(f"❌ Failed to upload {pattern['name']}: {response.status_code}")
                            
                except Exception as e:
                    print(f"❌ Error uploading {pattern['name']}: {e}")
            else:
                print(f"⚠️  PDF file not found: {pattern['pdf_file']}")
        elif pattern["pattern_id"] in railway_pattern_ids:
            print(f"⏭️  Skipping {pattern['name']}: Already on Railway")
        else:
            print(f"⚠️  Skipping {pattern['name']}: {pattern.get('error', 'Not backed up')}")
    
    print(f"\n🎉 Sync completed!")
    print(f"📄 Files uploaded: {uploaded_count}/{total_patterns}")

def compare_local_railway():
    """Compare local and Railway PDFs"""
    print("🔍 Comparing local and Railway PDFs...")
    
    local_pdfs = get_local_pdfs()
    railway_pdfs = get_railway_pdfs()
    
    local_pattern_ids = {p[0] for p in local_pdfs}
    railway_pattern_ids = {p["pattern_id"] for p in railway_pdfs}
    
    print(f"📊 Local PDFs: {len(local_pdfs)}")
    print(f"📊 Railway PDFs: {len(railway_pdfs)}")
    
    missing_on_railway = local_pattern_ids - railway_pattern_ids
    missing_locally = railway_pattern_ids - local_pattern_ids
    
    if missing_on_railway:
        print(f"\n❌ Missing on Railway ({len(missing_on_railway)}):")
        for pattern_id in missing_on_railway:
            pattern = next(p for p in local_pdfs if p[0] == pattern_id)
            print(f"   - {pattern[1]} (ID: {pattern_id})")
    
    if missing_locally:
        print(f"\n❌ Missing locally ({len(missing_locally)}):")
        for pattern_id in missing_locally:
            pattern = next(p for p in railway_pdfs if p["pattern_id"] == pattern_id)
            print(f"   - {pattern['name']} (ID: {pattern_id})")
    
    if not missing_on_railway and not missing_locally:
        print("✅ Local and Railway PDFs are in sync!")

def show_status():
    """Show current PDF status"""
    print("📋 PDF Status Report")
    print("=" * 50)
    
    # Local status
    local_pdfs = get_local_pdfs()
    print(f"📁 Local PDFs: {len(local_pdfs)}")
    for pattern_id, name, designer, pdf_file in local_pdfs:
        file_path = os.path.join(PDF_UPLOADS_DIR, pdf_file)
        exists = "✅" if os.path.exists(file_path) else "❌"
        print(f"   {exists} {name} (ID: {pattern_id})")
    
    print()
    
    # Railway status
    railway_pdfs = get_railway_pdfs()
    print(f"☁️  Railway PDFs: {len(railway_pdfs)}")
    for pattern in railway_pdfs:
        print(f"   ✅ {pattern['name']} (ID: {pattern['pattern_id']})")
    
    print()
    
    # Backup status
    if os.path.exists(BACKUP_DIR):
        metadata_path = os.path.join(BACKUP_DIR, "metadata.json")
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            print(f"💾 Backup: {metadata['total_patterns']} patterns backed up on {metadata['backup_date']}")
        else:
            print("💾 Backup: Directory exists but no metadata")
    else:
        print("💾 Backup: No backup found")

def main():
    """Main function"""
    import sys
    
    if len(sys.argv) < 2:
        print("StitchMatch PDF Management")
        print("=" * 30)
        print("Commands:")
        print("  backup    - Create backup of PDFs")
        print("  restore   - Restore PDFs from backup")
        print("  sync      - Sync PDFs to Railway")
        print("  compare   - Compare local and Railway PDFs")
        print("  status    - Show current status")
        print("  full      - Backup, sync to Railway, and show status")
        return
    
    command = sys.argv[1].lower()
    
    if command == "backup":
        create_backup()
    elif command == "restore":
        restore_from_backup()
    elif command == "sync":
        sync_to_railway()
    elif command == "compare":
        compare_local_railway()
    elif command == "status":
        show_status()
    elif command == "full":
        print("🔄 Running full PDF management workflow...")
        create_backup()
        sync_to_railway()
        show_status()
    else:
        print(f"❌ Unknown command: {command}")

if __name__ == "__main__":
    main() 