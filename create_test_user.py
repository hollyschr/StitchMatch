#!/usr/bin/env python3
"""
Script to create a test user in Supabase
"""

import requests
import json
import os

# Supabase configuration - you'll need to update these with your actual values
SUPABASE_URL = "https://vuofkaqhyjufkgfpeikn.supabase.co"  # Update with your Supabase URL
SUPABASE_ANON_KEY = "your_anon_key_here"  # Update with your anon key

def create_test_user():
    """Create a test user in Supabase"""
    print("🔧 Creating test user in Supabase...")
    
    # Test user credentials
    test_user = {
        "email": "test@gmail.com",
        "password": "pass123",  # Using a more secure password
        "user_metadata": {
            "name": "Test User",
            "profile_photo": None
        }
    }
    
    # Create user via Supabase Auth API
    url = f"{SUPABASE_URL}/auth/v1/signup"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, headers=headers, json=test_user)
        
        if response.status_code == 200:
            print("✅ Test user created successfully!")
            print(f"📧 Email: {test_user['email']}")
            print(f"🔑 Password: {test_user['password']}")
            print("\nYou can now log in with these credentials.")
        else:
            print(f"❌ Failed to create user: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error creating user: {e}")

def main():
    print("StitchMatch Test User Setup")
    print("=" * 30)
    print("\nThis script will create a test user in your Supabase project.")
    print("You'll need to update the SUPABASE_URL and SUPABASE_ANON_KEY variables")
    print("with your actual Supabase credentials.\n")
    
    # Check if credentials are set
    if SUPABASE_ANON_KEY == "your_anon_key_here":
        print("❌ Please update the SUPABASE_ANON_KEY in this script first!")
        print("\nTo get your Supabase credentials:")
        print("1. Go to https://supabase.com/dashboard")
        print("2. Select your project")
        print("3. Go to Settings > API")
        print("4. Copy the 'anon public' key")
        print("5. Update the SUPABASE_ANON_KEY variable in this script")
        return
    
    create_test_user()

if __name__ == "__main__":
    main() 