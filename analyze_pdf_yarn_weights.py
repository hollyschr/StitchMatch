#!/usr/bin/env python3
"""
Script to analyze PDFs in pattern folders and extract yarn weight information.
Handles cases where multiple yarns are held together and calculates combined weights.
"""

import os
import re
try:
    import PyPDF2
except ImportError:
    import pypdf as PyPDF2
import pdfplumber
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import json

class YarnWeightAnalyzer:
    def __init__(self):
        # Yarn weight categories with their typical WPI (wraps per inch) ranges
        self.yarn_weights = {
            'lace': {'names': ['lace', 'cobweb', 'thread'], 'wpi_range': (35, 40), 'weight': 'Lace'},
            'fingering': {'names': ['fingering', 'sock', 'baby', '1-ply'], 'wpi_range': (14, 16), 'weight': 'Fingering (14 wpi)'},
            'sport': {'names': ['sport', '5-ply'], 'wpi_range': (12, 14), 'weight': 'Sport (12 wpi)'},
            'dk': {'names': ['dk', 'double knitting', '8-ply'], 'wpi_range': (11, 12), 'weight': 'DK (11 wpi)'},
            'worsted': {'names': ['worsted', 'aran', '10-ply'], 'wpi_range': (9, 11), 'weight': 'Worsted (9 wpi)'},
            'aran': {'names': ['aran', 'chunky'], 'wpi_range': (8, 9), 'weight': 'Aran (8 wpi)'},
            'bulky': {'names': ['bulky', 'chunky', '12-ply'], 'wpi_range': (7, 8), 'weight': 'Bulky (7 wpi)'},
            'super_bulky': {'names': ['super bulky', 'super chunky', 'jumbo'], 'wpi_range': (5, 6), 'weight': 'Super Bulky (5-6 wpi)'}
        }

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF using multiple methods"""
        text = ""
        
        # Try pdfplumber first (better for text extraction)
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            print(f"pdfplumber failed for {pdf_path}: {e}")
        
        # Fallback to PyPDF2 if pdfplumber fails
        if not text.strip():
            try:
                with open(pdf_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page in pdf_reader.pages:
                        text += page.extract_text() + "\n"
            except Exception as e:
                print(f"PyPDF2 failed for {pdf_path}: {e}")
        
        return text

    def find_yarn_weight_info(self, text: str) -> Dict:
        """Extract yarn weight information from text"""
        text_lower = text.lower()
        
        # Look for yarn weight mentions
        weight_info = {
            'weights_found': [],
            'held_together': False,
            'combined_weight': None,
            'yardage': None,
            'gauge': None,
            'needle_size': None
        }
        
        # Check for "held together" patterns - expanded to catch more variations
        held_together_patterns = [
            r'(\d+)\s*(?:strands?|ply|yarns?)\s*(?:of|held\s+together)',
            r'held\s+together.*?(\d+)\s*(?:strands?|ply|yarns?)',
            r'(\d+)\s*(?:strands?|ply|yarns?)\s*held\s+together',
            r'(\d+)\s*(?:strands?|ply|yarns?)\s*with',
            r'(\d+)\s*(?:strands?|ply|yarns?)\s*and',
            r'(\d+)\s*(?:strands?|ply|yarns?)\s*\+',
            r'(\d+)\s*(?:strands?|ply|yarns?)\s*plus',
            r'(\d+)\s*(?:strands?|ply|yarns?)\s*held',
            r'held\s+with\s+(\d+)\s*(?:strands?|ply|yarns?)',
            r'(\d+)\s*(?:strands?|ply|yarns?)\s*held\s+with',
            r'(\d+)\s*(?:strands?|ply|yarns?)\s*held\s+and',
            r'(\d+)\s*(?:strands?|ply|yarns?)\s*held\s+plus'
        ]
        
        for pattern in held_together_patterns:
            match = re.search(pattern, text_lower)
            if match:
                weight_info['held_together'] = True
                weight_info['strands_count'] = int(match.group(1))
                break
        
        # Find individual yarn weights - improved to catch more variations
        for weight_name, weight_data in self.yarn_weights.items():
            for name in weight_data['names']:
                if name in text_lower:
                    weight_info['weights_found'].append(weight_data['weight'])
                    break
        
        # Additional weight detection patterns for common variations
        additional_weight_patterns = [
            (r'\b(?:yarn|weight|gauge).*?(?:aran|worsted|dk|sport|fingering|lace|bulky|chunky)', 'weight_mention'),
            (r'\b(?:aran|worsted|dk|sport|fingering|lace|bulky|chunky)\s+(?:weight|yarn)', 'weight_mention'),
            (r'\b(\d+)\s*(?:wpi|wraps?\s*per\s*inch)', 'wpi_mention'),
            (r'\b(?:light|medium|heavy)\s+(?:fingering|sport|dk|worsted|aran|bulky)', 'weight_mention')
        ]
        
        for pattern, pattern_type in additional_weight_patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                if pattern_type == 'wpi_mention':
                    # Extract WPI and convert to weight category
                    try:
                        wpi = int(match)
                        weight_category = self._wpi_to_weight_category(wpi)
                        if weight_category not in weight_info['weights_found']:
                            weight_info['weights_found'].append(weight_category)
                    except ValueError:
                        pass
                elif pattern_type == 'weight_mention':
                    # Extract weight from the match
                    for weight_name, weight_data in self.yarn_weights.items():
                        for name in weight_data['names']:
                            if name in match.lower():
                                if weight_data['weight'] not in weight_info['weights_found']:
                                    weight_info['weights_found'].append(weight_data['weight'])
                                break
        
        # Calculate combined weight if yarns are held together
        if weight_info['held_together'] and weight_info['weights_found']:
            # Use the first weight found as base
            base_weight = weight_info['weights_found'][0]
            strands = weight_info.get('strands_count', 2)
            
            # Calculate combined WPI (rough approximation)
            base_wpi = self._extract_wpi_from_weight(base_weight)
            if base_wpi:
                # More accurate calculation: when yarns are held together, 
                # the effective WPI decreases (thicker yarn)
                combined_wpi = base_wpi / strands
                weight_info['combined_weight'] = self._wpi_to_weight_category(combined_wpi)
                
                # Add debug info
                weight_info['calculation_debug'] = {
                    'base_weight': base_weight,
                    'base_wpi': base_wpi,
                    'strands': strands,
                    'combined_wpi': combined_wpi,
                    'result': weight_info['combined_weight']
                }
        
        # Extract yardage information
        yardage_patterns = [
            r'(\d+)\s*-\s*(\d+)\s*yards?',
            r'(\d+)\s*yards?',
            r'(\d+)\s*-\s*(\d+)\s*meters?',
            r'(\d+)\s*meters?'
        ]
        
        for pattern in yardage_patterns:
            match = re.search(pattern, text_lower)
            if match:
                if len(match.groups()) == 2:
                    weight_info['yardage'] = f"{match.group(1)}-{match.group(2)} yards"
                else:
                    weight_info['yardage'] = f"{match.group(1)} yards"
                break
        
        # Extract gauge information
        gauge_patterns = [
            r'(\d+)\s*stitches?\s*(?:and\s*)?(\d+)?\s*rows?\s*=\s*(\d+)\s*inches?',
            r'gauge.*?(\d+)\s*stitches?\s*(?:and\s*)?(\d+)?\s*rows?\s*=\s*(\d+)\s*inches?'
        ]
        
        for pattern in gauge_patterns:
            match = re.search(pattern, text_lower)
            if match:
                stitches = match.group(1)
                rows = match.group(2) if match.group(2) else "N/A"
                inches = match.group(3)
                weight_info['gauge'] = f"{stitches} sts and {rows} rows = {inches} inches"
                break
        
        # Extract needle size information
        needle_patterns = [
            r'us\s*(\d+(?:\.\d+)?)\s*[-\s]*(\d+(?:\.\d+)?)?\s*mm',
            r'(\d+(?:\.\d+)?)\s*mm\s*needles?',
            r'needle\s*size.*?(\d+(?:\.\d+)?)\s*mm'
        ]
        
        for pattern in needle_patterns:
            match = re.search(pattern, text_lower)
            if match:
                if len(match.groups()) == 2 and match.group(2):
                    weight_info['needle_size'] = f"US {match.group(1)}-{match.group(2)} mm"
                else:
                    weight_info['needle_size'] = f"{match.group(1)} mm"
                break
        
        return weight_info

    def _extract_wpi_from_weight(self, weight_str: str) -> Optional[int]:
        """Extract WPI from weight string"""
        wpi_match = re.search(r'(\d+)\s*wpi', weight_str.lower())
        if wpi_match:
            return int(wpi_match.group(1))
        
        # Default WPIs for common weights
        default_wpis = {
            'lace': 35,
            'fingering': 14,
            'sport': 12,
            'dk': 11,
            'worsted': 9,
            'aran': 8,
            'bulky': 7,
            'super bulky': 5
        }
        
        for weight_name, wpi in default_wpis.items():
            if weight_name in weight_str.lower():
                return wpi
        
        return None

    def _wpi_to_weight_category(self, wpi: float) -> str:
        """Convert WPI to weight category"""
        if wpi >= 35:
            return "Lace"
        elif wpi >= 14:
            return "Fingering (14 wpi)"
        elif wpi >= 12:
            return "Sport (12 wpi)"
        elif wpi >= 11:
            return "DK (11 wpi)"
        elif wpi >= 9:
            return "Worsted (9 wpi)"
        elif wpi >= 8:
            return "Aran (8 wpi)"
        elif wpi >= 7:
            return "Bulky (7 wpi)"
        else:
            return "Super Bulky (5-6 wpi)"

    def analyze_patterns_folder(self, patterns_folder: str = "/Users/hollyschreiber/patterns") -> Dict:
        """Analyze all PDFs in the patterns folder"""
        patterns_folder = Path(patterns_folder)
        
        if not patterns_folder.exists():
            print(f"Patterns folder not found: {patterns_folder}")
            return {}
        
        results = {}
        pdf_count = 0
        processed_count = 0
        
        # Find all PDF files recursively
        pdf_files = list(patterns_folder.rglob("*.pdf"))
        print(f"Found {len(pdf_files)} PDF files to analyze...")
        
        for pdf_file in pdf_files:
            pdf_count += 1
            print(f"Processing {pdf_count}/{len(pdf_files)}: {pdf_file.name}")
            
            try:
                text = self.extract_text_from_pdf(str(pdf_file))
                if text.strip():
                    weight_info = self.find_yarn_weight_info(text)
                    
                    if weight_info['weights_found'] or weight_info['held_together']:
                        processed_count += 1
                        results[pdf_file.name] = {
                            'file_path': str(pdf_file),
                            'yarn_weight_info': weight_info,
                            'text_preview': text[:500] + "..." if len(text) > 500 else text
                        }
                        
                        # Print summary for this pattern
                        if weight_info['held_together']:
                            print(f"  ✓ Held together: {weight_info.get('strands_count', '?')} strands")
                            if weight_info['combined_weight']:
                                print(f"    Combined weight: {weight_info['combined_weight']}")
                        else:
                            print(f"  ✓ Weights found: {', '.join(weight_info['weights_found'])}")
                        
                        if weight_info['yardage']:
                            print(f"    Yardage: {weight_info['yardage']}")
                        if weight_info['gauge']:
                            print(f"    Gauge: {weight_info['gauge']}")
                        if weight_info['needle_size']:
                            print(f"    Needle size: {weight_info['needle_size']}")
                    else:
                        print(f"  ✗ No yarn weight info found")
                else:
                    print(f"  ✗ Could not extract text")
                    
            except Exception as e:
                print(f"  ✗ Error processing {pdf_file.name}: {e}")
        
        print(f"\nAnalysis complete!")
        print(f"Total PDFs processed: {pdf_count}")
        print(f"PDFs with yarn weight info: {processed_count}")
        print(f"Success rate: {processed_count/pdf_count*100:.1f}%")
        
        return results

def main():
    analyzer = YarnWeightAnalyzer()
    
    # Analyze all patterns in the main patterns folder
    print("Analyzing yarn weights in patterns folder...")
    results = analyzer.analyze_patterns_folder()
    
    # Save results
    output_file = "yarn_weight_analysis.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nResults saved to {output_file}")
    
    # Print summary statistics
    if results:
        weight_counts = {}
        held_together_count = 0
        
        for pattern_name, data in results.items():
            weight_info = data['yarn_weight_info']
            
            if weight_info['held_together']:
                held_together_count += 1
                if weight_info['combined_weight']:
                    weight_counts[weight_info['combined_weight']] = weight_counts.get(weight_info['combined_weight'], 0) + 1
            else:
                for weight in weight_info['weights_found']:
                    weight_counts[weight] = weight_counts.get(weight, 0) + 1
        
        print(f"\nWeight distribution:")
        for weight, count in sorted(weight_counts.items()):
            print(f"  {weight}: {count} patterns")
        
        print(f"\nPatterns with held together yarns: {held_together_count}")

if __name__ == "__main__":
    main() 