#!/usr/bin/env python3
"""
Script to help manually review and correct yarn weights for each pattern.
This will create a CSV file that can be easily edited and then imported back.
"""

import json
import csv
from pathlib import Path

def load_existing_analysis():
    """Load the existing yarn weight analysis"""
    try:
        with open('yarn_weight_analysis.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("No existing yarn_weight_analysis.json found")
        return {}

def create_review_csv():
    """Create a CSV file for manual review of yarn weights"""
    analysis = load_existing_analysis()
    
    # Create CSV for manual review
    with open('yarn_weight_review.csv', 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = [
            'filename', 
            'current_weight', 
            'current_held_together', 
            'current_combined_weight',
            'corrected_weight',
            'corrected_held_together',
            'corrected_combined_weight',
            'notes'
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for filename, data in analysis.items():
            yarn_info = data.get('yarn_weight_info', {})
            
            row = {
                'filename': filename,
                'current_weight': ', '.join(yarn_info.get('weights_found', [])),
                'current_held_together': yarn_info.get('held_together', False),
                'current_combined_weight': yarn_info.get('combined_weight', ''),
                'corrected_weight': '',  # To be filled manually
                'corrected_held_together': '',  # To be filled manually
                'corrected_combined_weight': '',  # To be filled manually
                'notes': ''  # For any notes about corrections
            }
            writer.writerow(row)
    
    print(f"Created yarn_weight_review.csv with {len(analysis)} patterns")
    print("Please edit this CSV file manually, then run the import script")

def import_corrected_weights():
    """Import corrected weights from the CSV file"""
    analysis = load_existing_analysis()
    
    try:
        with open('yarn_weight_review.csv', 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            
            for row in reader:
                filename = row['filename']
                if filename in analysis:
                    # Update the analysis with corrected weights
                    if row['corrected_weight']:
                        analysis[filename]['yarn_weight_info']['weights_found'] = [
                            w.strip() for w in row['corrected_weight'].split(',') if w.strip()
                        ]
                    
                    if row['corrected_held_together']:
                        analysis[filename]['yarn_weight_info']['held_together'] = (
                            row['corrected_held_together'].lower() in ['true', 'yes', '1']
                        )
                    
                    if row['corrected_combined_weight']:
                        analysis[filename]['yarn_weight_info']['combined_weight'] = row['corrected_combined_weight']
                    
                    # Add notes if provided
                    if row['notes']:
                        analysis[filename]['yarn_weight_info']['manual_notes'] = row['notes']
        
        # Save the corrected analysis
        with open('yarn_weight_analysis_corrected.json', 'w') as f:
            json.dump(analysis, f, indent=2)
        
        print("Imported corrected weights to yarn_weight_analysis_corrected.json")
        
    except FileNotFoundError:
        print("yarn_weight_review.csv not found. Please create it first.")

def show_pattern_summary():
    """Show a summary of current yarn weight distribution"""
    analysis = load_existing_analysis()
    
    weight_counts = {}
    held_together_count = 0
    
    for filename, data in analysis.items():
        yarn_info = data.get('yarn_weight_info', {})
        
        if yarn_info.get('held_together'):
            held_together_count += 1
            combined_weight = yarn_info.get('combined_weight')
            if combined_weight:
                weight_counts[combined_weight] = weight_counts.get(combined_weight, 0) + 1
        else:
            for weight in yarn_info.get('weights_found', []):
                weight_counts[weight] = weight_counts.get(weight, 0) + 1
    
    print(f"\nCurrent Yarn Weight Distribution ({len(analysis)} total patterns):")
    for weight, count in sorted(weight_counts.items()):
        print(f"  {weight}: {count} patterns")
    
    print(f"\nPatterns with held together yarns: {held_together_count}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "create":
            create_review_csv()
        elif command == "import":
            import_corrected_weights()
        elif command == "summary":
            show_pattern_summary()
        else:
            print("Usage: python manual_yarn_weight_review.py [create|import|summary]")
    else:
        print("Usage: python manual_yarn_weight_review.py [create|import|summary]")
        print("\nCommands:")
        print("  create  - Create CSV file for manual review")
        print("  import  - Import corrected weights from CSV")
        print("  summary - Show current weight distribution") 