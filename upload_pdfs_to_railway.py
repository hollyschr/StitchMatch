#!/usr/bin/env python3
"""
Upload PDF files to Railway using the API endpoints
This script uploads PDF files from backup to Railway
"""

import requests
import json
import os
from pathlib import Path

# Railway API endpoint
RAILWAY_API_URL = "https://web-production-e76a.up.railway.app"

def upload_pdf_to_railway(pattern_id: int, pdf_file_path: str):
    """Upload a single PDF file to Railway"""
    try:
        with open(pdf_file_path, 'rb') as f:
            files = {'file': (os.path.basename(pdf_file_path), f, 'application/pdf')}
            response = requests.post(f"{RAILWAY_API_URL}/upload-pdf/{pattern_id}", files=files)
            
            if response.status_code == 200:
                print(f"✅ Successfully uploaded PDF for pattern {pattern_id}")
                return True
            else:
                print(f"❌ Failed to upload PDF for pattern {pattern_id}: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ Error uploading PDF for pattern {pattern_id}: {e}")
        return False

def upload_pdfs_from_backup(backup_dir="pdf_backup"):
    """Upload all PDFs from backup to Railway"""
    print(f"📁 Uploading PDFs from {backup_dir} to Railway...")
    
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
    
    print(f"📊 Found {metadata['total_patterns']} patterns with PDFs")
    
    # Upload each PDF
    success_count = 0
    total_patterns = len(metadata["patterns"])
    
    for pattern in metadata["patterns"]:
        if pattern.get("backed_up", False):
            pdf_file_path = os.path.join(backup_dir, pattern["pdf_file"])
            
            if os.path.exists(pdf_file_path):
                if upload_pdf_to_railway(pattern["pattern_id"], pdf_file_path):
                    success_count += 1
            else:
                print(f"⚠️  PDF file not found: {pattern['pdf_file']}")
        else:
            print(f"⚠️  Skipping {pattern['name']}: {pattern.get('error', 'Not backed up')}")
    
    print(f"\n🎉 PDF upload completed!")
    print(f"📄 Files uploaded: {success_count}/{total_patterns}")

def check_railway_pdfs():
    """Check which patterns have PDFs on Railway"""
    print("🔍 Checking PDFs on Railway...")
    
    try:
        # Get all patterns from Railway
        response = requests.get(f"{RAILWAY_API_URL}/patterns?page_size=1000")
        
        if response.status_code == 200:
            data = response.json()
            patterns = data["patterns"]
            
            patterns_with_pdfs = [p for p in patterns if p.get("pdf_file")]
            
            print(f"📊 Found {len(patterns_with_pdfs)} patterns with PDFs on Railway:")
            for pattern in patterns_with_pdfs:
                print(f"   ✅ {pattern['name']} (ID: {pattern['pattern_id']}) - {pattern['pdf_file']}")
            
            return patterns_with_pdfs
        else:
            print(f"❌ Failed to get patterns from Railway: {response.status_code}")
            return []
            
    except Exception as e:
        print(f"❌ Error checking Railway PDFs: {e}")
        return []

def main():
    """Main function"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python upload_pdfs_to_railway.py upload  - Upload PDFs from backup to Railway")
        print("  python upload_pdfs_to_railway.py check   - Check PDFs on Railway")
        return
    
    command = sys.argv[1].lower()
    
    if command == "upload":
        upload_pdfs_from_backup()
    elif command == "check":
        check_railway_pdfs()
    else:
        print(f"❌ Unknown command: {command}")

if __name__ == "__main__":
    main() 