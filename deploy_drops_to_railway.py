#!/usr/bin/env python3
"""
Deploy DROPS patterns to Railway database
This script runs the DROPS importer on the live Railway database
"""

import requests
import time
import json

# Railway API endpoint (your live backend)
RAILWAY_API_URL = "https://web-production-e76a.up.railway.app"

def test_connection():
    """Test connection to Railway"""
    try:
        response = requests.get(f"{RAILWAY_API_URL}/test", timeout=10)
        if response.status_code == 200:
            print("✅ Connected to Railway successfully")
            return True
        else:
            print(f"❌ Railway connection failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Railway connection error: {e}")
        return False

def check_current_drops_count():
    """Check current DROPS pattern count on Railway"""
    try:
        response = requests.get(f"{RAILWAY_API_URL}/patterns?designer=DROPS&page_size=1", timeout=10)
        if response.status_code == 200:
            data = response.json()
            total = data['pagination']['total']
            print(f"📊 Current DROPS patterns on Railway: {total}")
            return total
        else:
            print(f"❌ Failed to get DROPS count: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error getting DROPS count: {e}")
        return None

def run_drops_import_on_railway():
    """Run the DROPS importer on Railway"""
    print("🚀 Starting DROPS import on Railway...")
    print("⚠️  This will take several minutes and may temporarily slow down the site.")
    
    # Since we can't directly run the importer on Railway, we'll need to:
    # 1. Either use Railway CLI to run the script
    # 2. Or manually run it through Railway's console
    # 3. Or create an admin endpoint to trigger the import
    
    print("\n📋 To deploy the new DROPS patterns, you have these options:")
    print("\nOption 1: Use Railway CLI (Recommended)")
    print("1. Install Railway CLI: npm install -g @railway/cli")
    print("2. Login: railway login")
    print("3. Link your project: railway link")
    print("4. Run the importer: railway run python drops_sweater_importer.py")
    
    print("\nOption 2: Use Railway Dashboard")
    print("1. Go to https://railway.app/dashboard")
    print("2. Select your StitchMatch project")
    print("3. Go to 'Deployments' tab")
    print("4. Click 'Deploy' to trigger a new deployment")
    print("5. The updated database will be deployed")
    
    print("\nOption 3: Create Admin Endpoint")
    print("1. Add an admin endpoint to trigger imports")
    print("2. Call the endpoint to run the import")
    print("3. This requires additional development")

def main():
    """Main function"""
    print("🎯 DROPS Pattern Deployment to Railway")
    print("=" * 50)
    
    # Test connection
    if not test_connection():
        print("❌ Cannot connect to Railway. Please check your internet connection.")
        return
    
    # Check current count
    current_count = check_current_drops_count()
    if current_count is None:
        print("❌ Cannot get current count. Aborting.")
        return
    
    print(f"\n📈 Local database has ~1,088 DROPS patterns")
    print(f"🌐 Railway has {current_count} DROPS patterns")
    
    if current_count >= 1000:
        print("✅ Railway already has a good number of DROPS patterns!")
    else:
        print("📈 Railway needs more DROPS patterns")
    
    # Show deployment options
    run_drops_import_on_railway()

if __name__ == "__main__":
    main() 