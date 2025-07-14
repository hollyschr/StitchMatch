#!/usr/bin/env python3
"""
Cloud storage solution for PDFs to prevent loss during server restarts
Uses a simple approach to store files in a persistent location
"""

import os
import shutil
import requests
import json
from datetime import datetime
from pathlib import Path

# Configuration
LOCAL_PDF_DIR = "pdf_uploads"
CLOUD_BACKUP_DIR = "cloud_pdfs"
METADATA_FILE = "pdf_metadata.json"

class CloudStorage:
    def __init__(self):
        self.metadata_file = METADATA_FILE
        self.cloud_dir = CLOUD_BACKUP_DIR
        self.load_metadata()
    
    def load_metadata(self):
        """Load PDF metadata from file"""
        if os.path.exists(self.metadata_file):
            with open(self.metadata_file, 'r') as f:
                self.metadata = json.load(f)
        else:
            self.metadata = {
                "pdfs": {},
                "last_updated": datetime.now().isoformat()
            }
    
    def save_metadata(self):
        """Save PDF metadata to file"""
        self.metadata["last_updated"] = datetime.now().isoformat()
        with open(self.metadata_file, 'w') as f:
            json.dump(self.metadata, f, indent=2)
    
    def backup_pdf(self, pattern_id: int, pdf_filename: str, source_path: str):
        """Backup a PDF file to cloud storage"""
        try:
            # Create cloud directory if it doesn't exist
            os.makedirs(self.cloud_dir, exist_ok=True)
            
            # Copy file to cloud storage
            dest_path = os.path.join(self.cloud_dir, pdf_filename)
            shutil.copy2(source_path, dest_path)
            
            # Update metadata
            self.metadata["pdfs"][pdf_filename] = {
                "pattern_id": pattern_id,
                "original_path": source_path,
                "cloud_path": dest_path,
                "file_size": os.path.getsize(source_path),
                "backed_up": datetime.now().isoformat(),
                "status": "active"
            }
            
            self.save_metadata()
            print(f"✅ Backed up PDF: {pdf_filename} for pattern {pattern_id}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to backup PDF {pdf_filename}: {e}")
            return False
    
    def restore_pdf(self, pdf_filename: str, dest_path: str):
        """Restore a PDF file from cloud storage"""
        try:
            if pdf_filename not in self.metadata["pdfs"]:
                print(f"⚠️  PDF {pdf_filename} not found in metadata")
                return False
            
            cloud_path = self.metadata["pdfs"][pdf_filename]["cloud_path"]
            
            if not os.path.exists(cloud_path):
                print(f"⚠️  PDF file not found in cloud storage: {cloud_path}")
                return False
            
            # Copy from cloud storage to destination
            shutil.copy2(cloud_path, dest_path)
            print(f"✅ Restored PDF: {pdf_filename}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to restore PDF {pdf_filename}: {e}")
            return False
    
    def restore_all_pdfs(self):
        """Restore all PDFs from cloud storage"""
        print("🔄 Restoring all PDFs from cloud storage...")
        
        # Create local PDF directory if it doesn't exist
        os.makedirs(LOCAL_PDF_DIR, exist_ok=True)
        
        restored_count = 0
        total_pdfs = len(self.metadata["pdfs"])
        
        for pdf_filename, info in self.metadata["pdfs"].items():
            if info["status"] == "active":
                dest_path = os.path.join(LOCAL_PDF_DIR, pdf_filename)
                if self.restore_pdf(pdf_filename, dest_path):
                    restored_count += 1
        
        print(f"🎉 Restored {restored_count}/{total_pdfs} PDFs")
        return restored_count
    
    def backup_all_pdfs(self):
        """Backup all PDFs from local storage"""
        print("🔄 Backing up all PDFs to cloud storage...")
        
        if not os.path.exists(LOCAL_PDF_DIR):
            print("❌ Local PDF directory not found")
            return 0
        
        backed_up_count = 0
        
        for filename in os.listdir(LOCAL_PDF_DIR):
            if filename.endswith('.pdf'):
                source_path = os.path.join(LOCAL_PDF_DIR, filename)
                
                # Extract pattern_id from filename (format: pattern_12345_abc123.pdf)
                try:
                    pattern_id = int(filename.split('_')[1])
                    if self.backup_pdf(pattern_id, filename, source_path):
                        backed_up_count += 1
                except (IndexError, ValueError):
                    print(f"⚠️  Could not extract pattern_id from filename: {filename}")
        
        print(f"🎉 Backed up {backed_up_count} PDFs")
        return backed_up_count
    
    def list_pdfs(self):
        """List all PDFs in cloud storage"""
        print("📋 PDFs in cloud storage:")
        for pdf_filename, info in self.metadata["pdfs"].items():
            status = "✅" if info["status"] == "active" else "❌"
            print(f"   {status} {pdf_filename} (Pattern {info['pattern_id']}) - {info['file_size']} bytes")
    
    def cleanup_orphaned_pdfs(self):
        """Remove PDFs that no longer exist in local storage"""
        print("🧹 Cleaning up orphaned PDFs...")
        
        orphaned_count = 0
        for pdf_filename, info in list(self.metadata["pdfs"].items()):
            local_path = os.path.join(LOCAL_PDF_DIR, pdf_filename)
            if not os.path.exists(local_path):
                # Mark as orphaned
                self.metadata["pdfs"][pdf_filename]["status"] = "orphaned"
                orphaned_count += 1
        
        if orphaned_count > 0:
            self.save_metadata()
            print(f"🗑️  Marked {orphaned_count} PDFs as orphaned")
        else:
            print("✅ No orphaned PDFs found")

def main():
    """Main function for command line usage"""
    import sys
    
    storage = CloudStorage()
    
    if len(sys.argv) < 2:
        print("Cloud Storage for PDFs")
        print("=" * 30)
        print("Commands:")
        print("  backup    - Backup all PDFs to cloud storage")
        print("  restore   - Restore all PDFs from cloud storage")
        print("  list      - List all PDFs in cloud storage")
        print("  cleanup   - Clean up orphaned PDFs")
        return
    
    command = sys.argv[1].lower()
    
    if command == "backup":
        storage.backup_all_pdfs()
    elif command == "restore":
        storage.restore_all_pdfs()
    elif command == "list":
        storage.list_pdfs()
    elif command == "cleanup":
        storage.cleanup_orphaned_pdfs()
    else:
        print(f"❌ Unknown command: {command}")

if __name__ == "__main__":
    main() 