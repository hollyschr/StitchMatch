#!/usr/bin/env python3
"""
Test script for StitchMatch pagination functionality
"""

import requests
import json

BASE_URL = "http://localhost:8080"

def test_patterns_pagination():
    """Test the /patterns/ endpoint with pagination"""
    print("Testing /patterns/ endpoint pagination...")
    
    # Test first page
    response = requests.get(f"{BASE_URL}/patterns/?page=1&page_size=30")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ First page: {len(data['patterns'])} patterns (should be 30)")
        print(f"   Total: {data['pagination']['total']}")
        print(f"   Pages: {data['pagination']['pages']}")
        print(f"   Has next: {data['pagination']['has_next']}")
        print(f"   Has prev: {data['pagination']['has_prev']}")
        
        # Test second page if available
        if data['pagination']['has_next']:
            response2 = requests.get(f"{BASE_URL}/patterns/?page=2&page_size=30")
            if response2.status_code == 200:
                data2 = response2.json()
                print(f"✅ Second page: {len(data2['patterns'])} patterns")
                print(f"   Has next: {data2['pagination']['has_next']}")
                print(f"   Has prev: {data2['pagination']['has_prev']}")
            else:
                print(f"❌ Second page failed: {response2.status_code}")
    else:
        print(f"❌ First page failed: {response.status_code}")

def test_stash_match_pagination():
    """Test the /patterns/stash-match/{user_id} endpoint with pagination"""
    print("\nTesting /patterns/stash-match/{user_id} endpoint pagination...")
    
    # Test with user ID 2 (from your logs)
    response = requests.get(f"{BASE_URL}/patterns/stash-match/2?page=1&page_size=30")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Stash match first page: {len(data['patterns'])} patterns (should be 30)")
        print(f"   Total: {data['pagination']['total']}")
        print(f"   Pages: {data['pagination']['pages']}")
        print(f"   Has next: {data['pagination']['has_next']}")
        print(f"   Has prev: {data['pagination']['has_prev']}")
        
        # Test second page if available
        if data['pagination']['has_next']:
            response2 = requests.get(f"{BASE_URL}/patterns/stash-match/2?page=2&page_size=30")
            if response2.status_code == 200:
                data2 = response2.json()
                print(f"✅ Stash match second page: {len(data2['patterns'])} patterns")
                print(f"   Has next: {data2['pagination']['has_next']}")
                print(f"   Has prev: {data2['pagination']['has_prev']}")
            else:
                print(f"❌ Stash match second page failed: {response2.status_code}")
    else:
        print(f"❌ Stash match first page failed: {response.status_code}")

def test_filters_with_pagination():
    """Test that filters work correctly with pagination"""
    print("\nTesting filters with pagination...")
    
    # Test with a filter
    response = requests.get(f"{BASE_URL}/patterns/?page=1&page_size=30&craft_type=knitting")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Filtered results: {len(data['patterns'])} patterns")
        print(f"   Total: {data['pagination']['total']}")
        print(f"   Pages: {data['pagination']['pages']}")
        
        # Check that all returned patterns are knitting patterns
        all_knitting = all(p.get('craft_type', '').lower() == 'knitting' for p in data['patterns'])
        print(f"   All knitting patterns: {all_knitting}")
    else:
        print(f"❌ Filtered results failed: {response.status_code}")

def test_invalid_pagination():
    """Test handling of invalid pagination parameters"""
    print("\nTesting invalid pagination parameters...")
    
    # Test negative page
    response = requests.get(f"{BASE_URL}/patterns/?page=-1&page_size=30")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Negative page handled gracefully: {len(data['patterns'])} patterns")
    else:
        print(f"❌ Negative page failed: {response.status_code}")
    
    # Test zero page size
    response = requests.get(f"{BASE_URL}/patterns/?page=1&page_size=0")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Zero page size handled gracefully: {len(data['patterns'])} patterns")
    else:
        print(f"❌ Zero page size failed: {response.status_code}")

if __name__ == "__main__":
    print("🧪 Testing StitchMatch Pagination Implementation")
    print("=" * 50)
    
    try:
        test_patterns_pagination()
        test_stash_match_pagination()
        test_filters_with_pagination()
        test_invalid_pagination()
        
        print("\n" + "=" * 50)
        print("✅ Pagination tests completed!")
        print("\nTo test the frontend:")
        print("1. Open http://localhost:5173 in your browser")
        print("2. Navigate to the Search page")
        print("3. Perform a search and test pagination controls")
        print("4. Try both traditional pagination and 'Load More' modes")
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the backend is running on port 8080")
    except Exception as e:
        print(f"❌ Test failed with error: {e}") 