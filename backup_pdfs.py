#!/usr/bin/env python3
"""
Backup PDF files and their metadata for preservation during database updates
This script creates a backup of all PDF files and their associated pattern data
"""

import sqlite3
import os
import shutil
import json
from datetime import datetime

def backup_pdfs():
    """Backup all PDF files and their metadata"""
    print("📁 Starting PDF backup...")
    
    # Create backup directory
    backup_dir = "pdf_backup"
    if os.path.exists(backup_dir):
        shutil.rmtree(backup_dir)
    os.makedirs(backup_dir)
    
    # Connect to database
    conn = sqlite3.connect('StitchMatch.db')
    cursor = conn.cursor()
    
    # Get all patterns with PDF files
    cursor.execute("""
        SELECT pattern_id, name, designer, pdf_file 
        FROM Pattern 
        WHERE pdf_file IS NOT NULL AND pdf_file != ''
    """)
    
    patterns_with_pdfs = cursor.fetchall()
    
    if not patterns_with_pdfs:
        print("❌ No patterns with PDF files found")
        conn.close()
        return
    
    print(f"📊 Found {len(patterns_with_pdfs)} patterns with PDF files")
    
    # Create metadata file
    metadata = {
        "backup_date": datetime.now().isoformat(),
        "total_patterns": len(patterns_with_pdfs),
        "patterns": []
    }
    
    # Copy PDF files and record metadata
    pdf_uploads_dir = "pdf_uploads"
    copied_count = 0
    
    for pattern_id, name, designer, pdf_file in patterns_with_pdfs:
        source_path = os.path.join(pdf_uploads_dir, pdf_file)
        dest_path = os.path.join(backup_dir, pdf_file)
        
        if os.path.exists(source_path):
            try:
                shutil.copy2(source_path, dest_path)
                copied_count += 1
                
                # Add to metadata
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
    metadata_path = os.path.join(backup_dir, "metadata.json")
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    conn.close()
    
    print(f"\n🎉 PDF backup completed!")
    print(f"📁 Backup directory: {backup_dir}")
    print(f"📄 Files copied: {copied_count}/{len(patterns_with_pdfs)}")
    print(f"📋 Metadata saved: {metadata_path}")
    
    return backup_dir

def restore_pdfs(backup_dir="pdf_backup"):
    """Restore PDF files from backup"""
    print(f"📁 Restoring PDFs from {backup_dir}...")
    
    if not os.path.exists(backup_dir):
        print(f"❌ Backup directory not found: {backup_dir}")
        return
    
    # Load metadata
    metadata_path = os.path.join(backup_dir, "metadata.json")
    if not os.path.exists(metadata_path):
        print(f"❌ Metadata file not found: {metadata_path}")
        return
    
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
    
    # Create pdf_uploads directory if it doesn't exist
    pdf_uploads_dir = "pdf_uploads"
    os.makedirs(pdf_uploads_dir, exist_ok=True)
    
    # Restore PDF files
    restored_count = 0
    total_patterns = len(metadata["patterns"])
    
    for pattern in metadata["patterns"]:
        if pattern.get("backed_up", False):
            source_path = os.path.join(backup_dir, pattern["pdf_file"])
            dest_path = os.path.join(pdf_uploads_dir, pattern["pdf_file"])
            
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
    
    print(f"\n🎉 PDF restoration completed!")
    print(f"📄 Files restored: {restored_count}/{total_patterns}")

def list_backup_info(backup_dir="pdf_backup"):
    """List information about the backup"""
    if not os.path.exists(backup_dir):
        print(f"❌ Backup directory not found: {backup_dir}")
        return
    
    metadata_path = os.path.join(backup_dir, "metadata.json")
    if not os.path.exists(metadata_path):
        print(f"❌ Metadata file not found: {metadata_path}")
        return
    
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
    
    print(f"📋 Backup Information:")
    print(f"   Date: {metadata['backup_date']}")
    print(f"   Total patterns: {metadata['total_patterns']}")
    
    backed_up = sum(1 for p in metadata['patterns'] if p.get('backed_up', False))
    print(f"   Successfully backed up: {backed_up}")
    print(f"   Failed: {metadata['total_patterns'] - backed_up}")
    
    print(f"\n📄 Patterns with PDFs:")
    for pattern in metadata['patterns']:
        status = "✅" if pattern.get('backed_up', False) else "❌"
        print(f"   {status} {pattern['name']} (ID: {pattern['pattern_id']}) - {pattern['pdf_file']}")

def main():
    """Main function"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python backup_pdfs.py backup    - Create backup of PDFs")
        print("  python backup_pdfs.py restore   - Restore PDFs from backup")
        print("  python backup_pdfs.py info      - Show backup information")
        return
    
    command = sys.argv[1].lower()
    
    if command == "backup":
        backup_pdfs()
    elif command == "restore":
        restore_pdfs()
    elif command == "info":
        list_backup_info()
    else:
        print(f"❌ Unknown command: {command}")

if __name__ == "__main__":
    main() 