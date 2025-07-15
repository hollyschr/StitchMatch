import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Package, Trash2, Download, Upload, Maximize2, Minimize2, Heart, Edit, Pin } from 'lucide-react';
import API_CONFIG from '@/config/api';
import GoogleDrivePicker from './GoogleDrivePicker';
import { Dialog as UIDialog, DialogContent as UIDialogContent, DialogHeader as UIDialogHeader, DialogTitle as UIDialogTitle } from '@/components/ui/dialog';

interface Pattern {
  pattern_id: number;
  name: string;
  designer: string;
  image: string;
  description?: string;
  price?: string;
  project_type?: string;
  craft_type?: string;
  required_weight?: string;
  pattern_url?: string;
  yardage_min?: number;
  yardage_max?: number;
  grams_min?: number;
  grams_max?: number;
  google_drive_file_id?: string;
  held_yarn_description?: string;
}

interface YarnStash {
  id: string;
  yarnName: string;
  brand: string;
  weight: string;
  fiber: string;
  yardage: number;
  grams: number;
}

interface PatternCardProps {
  pattern: Pattern;
  yarnStash?: YarnStash[];
  isStashMatchingMode?: boolean;
  showDeleteButton?: boolean;
  onDelete?: (patternId: number) => void;
  showUploadButton?: boolean;
  onUploadPdf?: (patternId: number, file: File) => void;
  onUploadGoogleDrive?: (patternId: number, fileId: string, fileName: string) => void;
  showDownloadButton?: boolean;
  showEditButton?: boolean;
  onEdit?: (pattern: Pattern) => void;
  variant?: 'search' | 'patterns';
  showFavoriteButton?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: (patternId: number) => void;
  cardSize?: 'default' | 'small';
  isWip?: boolean;
  onToggleWip?: (patternId: number) => void;
}

const PatternCard = ({ 
  pattern, 
  yarnStash = [], 
  isStashMatchingMode = false,
  showDeleteButton = false,
  onDelete,
  showUploadButton = false,
  onUploadPdf,
  onUploadGoogleDrive,
  showDownloadButton = false,
  showEditButton = false,
  onEdit,
  variant = 'search',
  showFavoriteButton = false,
  isFavorited = false,
  onToggleFavorite,
  cardSize = 'default',
  isWip,
  onToggleWip,
}: PatternCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isPdfFullScreen, setIsPdfFullScreen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [showGoogleDrivePicker, setShowGoogleDrivePicker] = useState(false);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedMatchDescription, setSelectedMatchDescription] = useState<string | null>(null);
  const [selectedMatchYarns, setSelectedMatchYarns] = useState<YarnStash[]>([]);

  // Helper function to get placeholder URL based on craft type
  const getPlaceholderUrl = (craftType?: string) => {
    return "https://t4.ftcdn.net/jpg/04/70/97/15/360_F_470971535_tR6xzNu1ogTUuv1ymANFS1Maqf8pBjVd.jpg";
  };

  // Ensure price is always a string and fallback to 'Free' if missing
  // For user-uploaded patterns (with pdf_file), show 'Owned' instead of 'Free'
  const displayPrice = pattern.google_drive_file_id
    ? 'Owned'
    : (pattern.price ? String(pattern.price) : 'Free');

  // Check if pattern matches the user's stash (for both search and patterns variants)
  const matchesStash = () => {
    if (!pattern.required_weight || yarnStash.length === 0) {
      return false;
    }

    // Map stash weight values to pattern weight values
    const weightMapping: { [key: string]: string[] } = {
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
      // Add full weight strings as keys for direct lookup
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
    };

    // Held yarn weight calculations
    const heldYarnCalculations: { [key: string]: { weight: string, description: string }[] } = {
      'thread': [
        { weight: 'Lace', description: '2 strands of thread = Lace weight' }
      ],
      'lace': [
        { weight: 'Fingering (14 wpi)', description: '2 strands of lace = Fingering to Sport weight' },
        { weight: 'Sport (12 wpi)', description: '2 strands of lace = Fingering to Sport weight' }
      ],
      'fingering': [
        { weight: 'DK (11 wpi)', description: '2 strands of fingering = DK weight' }
      ],
      'sport': [
        { weight: 'DK (11 wpi)', description: '2 strands of sport = DK or Light Worsted' },
        { weight: 'Worsted (9 wpi)', description: '2 strands of sport = DK or Light Worsted' }
      ],
      'dk': [
        { weight: 'Worsted (9 wpi)', description: '2 strands of DK = Worsted or Aran' },
        { weight: 'Aran (8 wpi)', description: '2 strands of DK = Worsted or Aran' }
      ],
      'worsted': [
        { weight: 'Bulky (7 wpi)', description: '2 strands of Worsted = Chunky' }
      ],
      'aran': [
        { weight: 'Bulky (7 wpi)', description: '2 strands of Aran = Chunky to Super Bulky' },
        { weight: 'Super Bulky (5-6 wpi)', description: '2 strands of Aran = Chunky to Super Bulky' }
      ],
      'bulky': [
        { weight: 'Super Bulky (5-6 wpi)', description: '2 strands of Chunky = Super Bulky to Jumbo' },
        { weight: 'Jumbo (0-4 wpi)', description: '2 strands of Chunky = Super Bulky to Jumbo' }
      ]
    };

    // Helper function to normalize weight strings for comparison
    const normalizeWeight = (weight: string): string => {
      return weight.toLowerCase().replace(/\s*\(\d+\s*wpi\)/, '');
    };

    // Helper function to check if a weight matches (including held yarn calculations)
    const checkWeightMatch = (stashWeight: string, patternWeight: string): { matches: boolean, description?: string } => {
      const stashNormalized = normalizeWeight(stashWeight);
      const patternNormalized = normalizeWeight(patternWeight);
      // Direct match
      if (stashNormalized === patternNormalized) {
        return { matches: true, description: `${stashWeight} (direct match)` };
      }
      // Check weight mapping
      const possiblePatternWeights = (weightMapping[stashWeight] || []).map(w => normalizeWeight(w));
      if (possiblePatternWeights.includes(patternNormalized)) {
        return { matches: true, description: `${stashWeight} (direct match)` };
      }
      // Check reverse mapping
      const possibleStashWeights = (weightMapping[patternWeight] || []).map(w => normalizeWeight(w));
      if (possibleStashWeights.includes(stashNormalized)) {
        return { matches: true, description: `${stashWeight} (direct match)` };
      }
      // Check held yarn calculations
      const heldCalculations = heldYarnCalculations[stashNormalized];
      if (heldCalculations) {
        for (const calc of heldCalculations) {
          if (normalizeWeight(calc.weight) === patternNormalized) {
            return { matches: true, description: calc.description };
          }
        }
      }
      // Check partial matching for cases like "fingering" vs "Fingering (14 wpi)"
      if (patternNormalized.includes(stashNormalized) || stashNormalized.includes(patternNormalized)) {
        return { matches: true, description: `${stashWeight} (direct match)` };
      }
      return { matches: false };
    };

    // Collect all matching stash yarns/weights
    let totalYardage = 0;
    let matchDescriptions: string[] = [];
    for (const yarn of yarnStash) {
      const weightCheck = checkWeightMatch(yarn.weight, pattern.required_weight);
      if (weightCheck.matches) {
        totalYardage += yarn.yardage;
        if (weightCheck.description) {
          matchDescriptions.push(weightCheck.description);
        }
      }
    }

    if (totalYardage === 0) {
      return false; // No yarn in this weight class
    }

    // Handle different yardage scenarios
    const hasMinYardage = pattern.yardage_min !== null && pattern.yardage_min !== undefined;
    const hasMaxYardage = pattern.yardage_max !== null && pattern.yardage_max !== undefined;
    let yardageMatches = false;
    if (hasMinYardage && hasMaxYardage) {
      yardageMatches = totalYardage >= pattern.yardage_max;
    } else if (hasMinYardage) {
      yardageMatches = totalYardage >= pattern.yardage_min;
    } else if (hasMaxYardage) {
      yardageMatches = totalYardage >= pattern.yardage_max;
    } else {
      return false;
    }

    // Store all match descriptions for display
    if (yardageMatches && matchDescriptions.length > 0) {
      (pattern as any).heldYarnDescription = [...new Set(matchDescriptions)].join(', ');
    }

    return yardageMatches;
  };

  // If we're in stash matching mode, all patterns shown should be green
  // Otherwise, use the individual pattern matching logic
  const isStashMatch = isStashMatchingMode || matchesStash();

  // Ensure stash match is calculated when dialog opens (patterns variant)
  useEffect(() => {
    if (variant === 'patterns' && isDetailDialogOpen) {
      matchesStash();
    }
    // eslint-disable-next-line
  }, [isDetailDialogOpen]);

  const handleCardClick = () => {
    if (variant === 'patterns') {
      setIsDetailDialogOpen(true);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleGoogleDriveFileSelect = (file: { id: string, name: string }) => {
    if (onUploadGoogleDrive) {
      onUploadGoogleDrive(pattern.pattern_id, file.id, file.name);
    }
    setShowGoogleDrivePicker(false);
  };

  const handleGoogleDriveCancel = () => {
    setShowGoogleDrivePicker(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(pattern.pattern_id);
    }
    setIsDeleteConfirmOpen(false);
    setIsDetailDialogOpen(false);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(pattern.pattern_id);
    }
  };

  // Compute stash match info for patterns variant expanded card
  let stashMatchDescriptions: string[] = [];
  if (variant === 'patterns' && isExpanded && yarnStash && yarnStash.length > 0 && pattern.required_weight) {
    // Use the same held yarn logic as matchesStash
    const heldYarnCombinations = [
      { from: ['Thread', 'Thread'], to: 'Lace' },
      { from: ['Lace', 'Lace'], to: 'Fingering' },
      { from: ['Sock', 'Sock'], to: 'Sport' },
      { from: ['Fingering', 'Fingering'], to: 'DK' },
      { from: ['Sport', 'Sport'], to: 'DK' },
      { from: ['Sport', 'Sport'], to: 'Worsted' },
      { from: ['DK', 'DK'], to: 'Worsted' },
      { from: ['DK', 'DK'], to: 'Aran' },
      { from: ['Worsted', 'Worsted'], to: 'Chunky' },
      { from: ['Aran', 'Aran'], to: 'Chunky' },
      { from: ['Aran', 'Aran'], to: 'Super Bulky' },
      { from: ['Chunky', 'Chunky'], to: 'Super Bulky' },
      { from: ['Chunky', 'Chunky'], to: 'Jumbo' },
      { from: ['Fingering', 'Lace'], to: 'DK' },
      { from: ['DK', 'Lace'], to: 'Worsted' },
    ];
    const normalize = (w: string) => w.trim().toLowerCase();
    yarnStash.forEach(yarn => {
      if (normalize(yarn.weight) === normalize(pattern.required_weight)) {
        stashMatchDescriptions.push(`${yarn.weight} (direct match)`);
      } else {
        for (const combo of heldYarnCombinations) {
          if (
            combo.from.every(f => normalize(f) === normalize(yarn.weight)) &&
            normalize(combo.to) === normalize(pattern.required_weight)
          ) {
            stashMatchDescriptions.push(`${combo.from.length} strands of ${yarn.weight.toLowerCase()} = ${combo.to} weight`);
            break;
          }
        }
      }
    });
    // Deduplicate before use
    stashMatchDescriptions = [...new Set(stashMatchDescriptions)];
  }

  // Helper for mapping match descriptions to matching yarns
  const getMatchDescriptionMap = () => {
    const map: { [desc: string]: YarnStash[] } = {};
    if (!pattern.required_weight || !yarnStash || yarnStash.length === 0) return map;

    // Map stash weight values to pattern weight values
    const weightMapping: { [key: string]: string[] } = {
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
    };
    const heldYarnCalculations: { [key: string]: { weight: string, description: string }[] } = {
      'thread': [
        { weight: 'Lace', description: '2 strands of thread = Lace weight' }
      ],
      'lace': [
        { weight: 'Fingering (14 wpi)', description: '2 strands of lace = Fingering to Sport weight' },
        { weight: 'Sport (12 wpi)', description: '2 strands of lace = Fingering to Sport weight' }
      ],
      'fingering': [
        { weight: 'DK (11 wpi)', description: '2 strands of fingering = DK weight' }
      ],
      'sport': [
        { weight: 'DK (11 wpi)', description: '2 strands of sport = DK or Light Worsted' },
        { weight: 'Worsted (9 wpi)', description: '2 strands of sport = DK or Light Worsted' }
      ],
      'dk': [
        { weight: 'Worsted (9 wpi)', description: '2 strands of DK = Worsted or Aran' },
        { weight: 'Aran (8 wpi)', description: '2 strands of DK = Worsted or Aran' }
      ],
      'worsted': [
        { weight: 'Bulky (7 wpi)', description: '2 strands of Worsted = Chunky' }
      ],
      'aran': [
        { weight: 'Bulky (7 wpi)', description: '2 strands of Aran = Chunky to Super Bulky' },
        { weight: 'Super Bulky (5-6 wpi)', description: '2 strands of Aran = Chunky to Super Bulky' }
      ],
      'bulky': [
        { weight: 'Super Bulky (5-6 wpi)', description: '2 strands of Chunky = Super Bulky to Jumbo' },
        { weight: 'Jumbo (0-4 wpi)', description: '2 strands of Chunky = Super Bulky to Jumbo' }
      ]
    };
    const normalizeWeight = (weight: string): string => {
      return weight.toLowerCase().replace(/\s*\(\d+\s*wpi\)/, '');
    };
    const checkWeightMatch = (stashWeight: string, patternWeight: string): { matches: boolean, description?: string } => {
      const stashNormalized = normalizeWeight(stashWeight);
      const patternNormalized = normalizeWeight(patternWeight);
      if (stashNormalized === patternNormalized) {
        return { matches: true, description: `${stashWeight} (direct match)` };
      }
      const possiblePatternWeights = (weightMapping[stashWeight] || []).map(w => normalizeWeight(w));
      if (possiblePatternWeights.includes(patternNormalized)) {
        return { matches: true, description: `${stashWeight} (direct match)` };
      }
      const possibleStashWeights = (weightMapping[patternWeight] || []).map(w => normalizeWeight(w));
      if (possibleStashWeights.includes(stashNormalized)) {
        return { matches: true, description: `${stashWeight} (direct match)` };
      }
      const heldCalculations = heldYarnCalculations[stashNormalized];
      if (heldCalculations) {
        for (const calc of heldCalculations) {
          if (normalizeWeight(calc.weight) === patternNormalized) {
            return { matches: true, description: calc.description };
          }
        }
      }
      if (patternNormalized.includes(stashNormalized) || stashNormalized.includes(patternNormalized)) {
        return { matches: true, description: `${stashWeight} (direct match)` };
      }
      return { matches: false };
    };
    for (const yarn of yarnStash) {
      const weightCheck = checkWeightMatch(yarn.weight, pattern.required_weight);
      if (weightCheck.matches && weightCheck.description) {
        if (!map[weightCheck.description]) map[weightCheck.description] = [];
        map[weightCheck.description].push(yarn);
      }
    }
    return map;
  };

  return (
    <>
      <Card className={`overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
        isStashMatch ? 'bg-green-100 border-green-400' : ''
      } ${variant === 'patterns' ? 'h-full flex flex-col' : ''} ${cardSize === 'small' ? 'max-w-xs p-2' : ''}`} onClick={handleCardClick}>
        <img 
          src={pattern.image || getPlaceholderUrl(pattern.craft_type)}
          alt={pattern.name}
          className={`w-full object-cover bg-gray-200 ${
            cardSize === 'small' ? 'h-24' : (variant === 'patterns' ? 'h-32' : 'h-48')
          }`}
        />
        <div className={`${cardSize === 'small' ? 'p-2' : (variant === 'patterns' ? 'p-3 flex-1 flex flex-col' : 'p-4')}`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className={`font-semibold flex-1 pr-2 ${
              cardSize === 'small' ? 'text-xs leading-tight' : (variant === 'patterns' ? 'text-sm leading-tight' : 'text-lg')
            }`}>{pattern.name}</h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              {typeof isWip !== 'undefined' && onToggleWip && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleWip(pattern.pattern_id);
                  }}
                  className={`transition-transform ${isWip ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
                  title={isWip ? 'Remove from WIP' : 'Mark as WIP'}
                >
                  <Pin className={`h-4 w-4 ${isWip ? 'fill-current' : ''}`} />
                </Button>
              )}
              {showFavoriteButton && onToggleFavorite && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleFavorite}
                  className={`hover:scale-110 transition-transform ${
                    isFavorited ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
                </Button>
              )}
              {showDeleteButton && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteClick}
                  className="text-red-500 hover:text-red-700"
                  title="Delete Pattern"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <p className={`text-gray-600 mb-2 ${
            cardSize === 'small' ? 'text-xs' : (variant === 'patterns' ? 'text-xs' : 'text-sm')
          }`}>by {pattern.designer}</p>
          
          {/* Show type, price, and craft above View Pattern button for search variant */}
          {variant === 'search' && (
            <div className="space-y-1 text-xs text-gray-500 mb-3">
              {pattern.project_type && (
                <p><span className="font-medium">Type:</span> {pattern.project_type}</p>
              )}
              {pattern.craft_type && (
                <p><span className="font-medium">Craft:</span> {pattern.craft_type}</p>
              )}
              <p><span className="font-medium">Price:</span> {displayPrice}</p>
              {isStashMatch && (
                <div className="flex items-center gap-1 text-xs text-green-800 bg-green-200 px-2 py-1 rounded w-fit mt-1">
                  <Package className="h-3 w-3" />
                  <span>Match</span>
                </div>
              )}
            </div>
          )}
          
          {/* Show only type and craft for patterns variant initially */}
          {variant === 'patterns' && (
            <div className="space-y-1 text-xs text-gray-500 mb-3 flex-1">
              {pattern.project_type && (
                <p><span className="font-medium">Type:</span> {pattern.project_type}</p>
              )}
              {pattern.craft_type && (
                <p><span className="font-medium">Craft:</span> {pattern.craft_type}</p>
              )}
              {pattern.google_drive_file_id && (
                <p className="text-green-600 font-medium">✓ PDF Available</p>
              )}
              {isStashMatch && (
                <div className="flex items-center gap-1 text-xs text-green-800 bg-green-200 px-2 py-1 rounded w-fit mt-1">
                  <Package className="h-3 w-3" />
                  {/* clickable match descriptions */}
                  {Object.keys(getMatchDescriptionMap()).length > 0 ? (
                    Object.entries(getMatchDescriptionMap()).map(([desc, yarns], i) => (
                      <button
                        key={desc}
                        className="underline hover:text-blue-700 focus:outline-none ml-1"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedMatchDescription(desc);
                          setSelectedMatchYarns(yarns);
                          setMatchDialogOpen(true);
                        }}
                        type="button"
                      >
                        {desc}
                      </button>
                    ))
                  ) : (
                    <span>Match</span>
                  )}
                </div>
              )}
            </div>
          )}
          
          {variant === 'search' && (
            <Button 
              className="w-full" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              View Details
            </Button>
          )}
          
          {variant === 'patterns' && (
            <div className="flex justify-between mt-2">
              {showEditButton && onEdit ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs flex-1 mx-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(pattern);
                  }}
                  title="Edit Pattern"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              ) : (
                <div className="flex-1 mx-1"></div>
              )}
              {pattern.google_drive_file_id ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs flex-1 mx-1"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const response = await fetch(`${API_CONFIG.baseUrl}/view-pdf/${pattern.pattern_id}`);
                      if (response.ok) {
                        const data = await response.json();
                        if (data.redirect_url) {
                          // This is a Google Drive file - open in new tab
                          window.open(data.redirect_url, '_blank');
                        } else {
                          // This is a local file - open in new tab
                          window.open(`${API_CONFIG.baseUrl}/view-pdf/${pattern.pattern_id}`, '_blank');
                        }
                      } else {
                        console.error('Failed to open PDF:', response.status);
                      }
                    } catch (error) {
                      console.error('Error opening PDF:', error);
                    }
                  }}
                >
                  <Download className="h-3 w-3 mr-1" />
                  PDF
                </Button>
              ) : showUploadButton ? (
                <div className="flex-1 mx-1">
                  {showGoogleDrivePicker ? (
                    <GoogleDrivePicker
                      onFileSelect={handleGoogleDriveFileSelect}
                      onCancel={handleGoogleDriveCancel}
                      className="w-full"
                    />
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs w-full border-2 border-gray-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowGoogleDrivePicker(true);
                      }}
                    >
                      Link PDF
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex-1 mx-1"></div>
              )}
              <Button 
                className="text-xs flex-1 mx-1" 
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDetailDialogOpen(true);
                }}
              >
                Details
              </Button>
            </div>
          )}
          
          {variant === 'patterns' && isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
              <div>
                <h4 className="font-medium text-sm mb-1">Designer:</h4>
                <p className="text-sm text-gray-700">{pattern.designer}</p>
                {Object.keys(getMatchDescriptionMap()).length > 0 && (
                  <div className="block text-xs text-green-700 font-medium mt-1">
                    Stash Match: {Object.entries(getMatchDescriptionMap()).map(([desc, yarns], i) => (
                      <button
                        key={desc}
                        className="underline hover:text-blue-700 focus:outline-none mr-2"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedMatchDescription(desc);
                          setSelectedMatchYarns(yarns);
                          setMatchDialogOpen(true);
                        }}
                        type="button"
                      >
                        {desc}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {(pattern.held_yarn_description || (pattern as any).heldYarnDescription) && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Stash Match:</h4>
                  <p className="text-sm text-green-700 font-medium">{pattern.held_yarn_description || (pattern as any).heldYarnDescription}</p>
                </div>
              )}
              <div>
                <h4 className="font-medium text-sm mb-1">Price:</h4>
                <p className="text-sm text-gray-700">{displayPrice}</p>
              </div>
              {pattern.project_type && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Project Type:</h4>
                  <p className="text-sm text-gray-700">{pattern.project_type}</p>
                </div>
              )}
              {pattern.craft_type && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Craft Type:</h4>
                  <p className="text-sm text-gray-700">{pattern.craft_type}</p>
                </div>
              )}
              {pattern.required_weight && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Yarn Weight:</h4>
                  <p className="text-sm text-gray-700">{pattern.required_weight}</p>
                </div>
              )}
              {(pattern.yardage_min || pattern.yardage_max) && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Yardage:</h4>
                  <p className="text-sm text-gray-700">
                    {pattern.yardage_min && pattern.yardage_max 
                      ? `${pattern.yardage_min} - ${pattern.yardage_max} yards`
                      : pattern.yardage_min 
                        ? `${pattern.yardage_min}+ yards`
                        : `Up to ${pattern.yardage_max} yards`
                    }
                  </p>
                </div>
              )}
              {(pattern.grams_min || pattern.grams_max) && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Grams:</h4>
                  <p className="text-sm text-gray-700">
                    {pattern.grams_min && pattern.grams_max 
                      ? `${pattern.grams_min} - ${pattern.grams_max} grams`
                      : pattern.grams_min 
                        ? `${pattern.grams_min}+ grams`
                        : `Up to ${pattern.grams_max} grams`
                    }
                  </p>
                </div>
              )}
              
              {/* PDF buttons for patterns */}
              <div className="flex gap-2">
                {showDownloadButton && pattern.google_drive_file_id && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const response = await fetch(`${API_CONFIG.baseUrl}/download-pdf/${pattern.pattern_id}`);
                        const data = await response.json();
                        
                        if (data.redirect_url) {
                          // This is a Google Drive file - open download URL
                          window.open(data.redirect_url, '_blank');
                        } else {
                          // This is a local file - open download URL
                          window.open(`${API_CONFIG.baseUrl}/download-pdf/${pattern.pattern_id}`, '_blank');
                        }
                      } catch (error) {
                        console.error('Error downloading PDF:', error);
                        alert('PDF could not be downloaded. Please try again.');
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download PDF
                  </Button>
                )}
                {showUploadButton && !pattern.google_drive_file_id && (
                  <div>
                    {showGoogleDrivePicker ? (
                      <GoogleDrivePicker
                        onFileSelect={handleGoogleDriveFileSelect}
                        onCancel={handleGoogleDriveCancel}
                        className="w-full"
                      />
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowGoogleDrivePicker(true);
                        }}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Link PDF
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {variant === 'search' && isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
              {pattern.description && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Description:</h4>
                  <p className="text-sm text-gray-700">{pattern.description}</p>
                </div>
              )}
              {pattern.required_weight && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Yarn Weight:</h4>
                  <p className="text-sm text-gray-700">{pattern.required_weight}</p>
                </div>
              )}
              {isStashMatch && yarnStash && yarnStash.length > 0 && pattern.required_weight && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Stash Match:</h4>
                  <div className="text-sm text-gray-700">
                    {pattern.held_yarn_description ? (
                      <p className="text-green-700">{pattern.held_yarn_description}</p>
                    ) : (() => {
                      // Calculate specific stash match descriptions
                      const matchDescriptions: string[] = [];
                      const weightMapping: { [key: string]: string[] } = {
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
                      };

                      const heldYarnCalculations: { [key: string]: { weight: string, description: string }[] } = {
                        'thread': [
                          { weight: 'Lace', description: '2 strands of thread = Lace weight' }
                        ],
                        'lace': [
                          { weight: 'Fingering (14 wpi)', description: '2 strands of lace = Fingering to Sport weight' },
                          { weight: 'Sport (12 wpi)', description: '2 strands of lace = Fingering to Sport weight' }
                        ],
                        'fingering': [
                          { weight: 'DK (11 wpi)', description: '2 strands of fingering = DK weight' }
                        ],
                        'sport': [
                          { weight: 'DK (11 wpi)', description: '2 strands of sport = DK or Light Worsted' },
                          { weight: 'Worsted (9 wpi)', description: '2 strands of sport = DK or Light Worsted' }
                        ],
                        'dk': [
                          { weight: 'Worsted (9 wpi)', description: '2 strands of DK = Worsted or Aran' },
                          { weight: 'Aran (8 wpi)', description: '2 strands of DK = Worsted or Aran' }
                        ],
                        'worsted': [
                          { weight: 'Bulky (7 wpi)', description: '2 strands of Worsted = Chunky' }
                        ],
                        'aran': [
                          { weight: 'Bulky (7 wpi)', description: '2 strands of Aran = Chunky to Super Bulky' },
                          { weight: 'Super Bulky (5-6 wpi)', description: '2 strands of Aran = Chunky to Super Bulky' }
                        ],
                        'bulky': [
                          { weight: 'Super Bulky (5-6 wpi)', description: '2 strands of Chunky = Super Bulky to Jumbo' },
                          { weight: 'Jumbo (0-4 wpi)', description: '2 strands of Chunky = Super Bulky to Jumbo' }
                        ]
                      };

                      const normalizeWeight = (weight: string): string => {
                        return weight.toLowerCase().replace(/\s*\(\d+\s*wpi\)/, '');
                      };

                      const checkWeightMatch = (stashWeight: string, patternWeight: string): { matches: boolean, description?: string } => {
                        const stashNormalized = normalizeWeight(stashWeight);
                        const patternNormalized = normalizeWeight(patternWeight);
                        
                        // Direct match
                        if (stashNormalized === patternNormalized) {
                          return { matches: true, description: `${stashWeight} (direct match)` };
                        }
                        
                        // Check weight mapping
                        const possiblePatternWeights = (weightMapping[stashWeight] || []).map(w => normalizeWeight(w));
                        if (possiblePatternWeights.includes(patternNormalized)) {
                          return { matches: true, description: `${stashWeight} (direct match)` };
                        }
                        
                        // Check reverse mapping
                        const possibleStashWeights = (weightMapping[patternWeight] || []).map(w => normalizeWeight(w));
                        if (possibleStashWeights.includes(stashNormalized)) {
                          return { matches: true, description: `${stashWeight} (direct match)` };
                        }
                        
                        // Check held yarn calculations
                        const heldCalculations = heldYarnCalculations[stashNormalized];
                        if (heldCalculations) {
                          for (const calc of heldCalculations) {
                            if (normalizeWeight(calc.weight) === patternNormalized) {
                              return { matches: true, description: calc.description };
                            }
                          }
                        }
                        
                        // Check partial matching for cases like "fingering" vs "Fingering (14 wpi)"
                        if (patternNormalized.includes(stashNormalized) || stashNormalized.includes(patternNormalized)) {
                          return { matches: true, description: `${stashWeight} (direct match)` };
                        }
                        
                        return { matches: false };
                      };

                      // Check each yarn in stash
                      for (const yarn of yarnStash) {
                        const weightCheck = checkWeightMatch(yarn.weight, pattern.required_weight);
                        if (weightCheck.matches && weightCheck.description) {
                          matchDescriptions.push(weightCheck.description);
                        }
                      }

                      return matchDescriptions.length > 0 ? (
                        <p className="text-green-700">{[...new Set(matchDescriptions)].join(', ')}</p>
                      ) : (
                        <p className="text-green-700">Pattern matches your stash!</p>
                      );
                    })()}
                  </div>
                </div>
              )}
              {(pattern.yardage_min || pattern.yardage_max) && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Yardage:</h4>
                  <p className="text-sm text-gray-700">
                    {pattern.yardage_min && pattern.yardage_max 
                      ? `${pattern.yardage_min} - ${pattern.yardage_max} yards`
                      : pattern.yardage_min 
                        ? `${pattern.yardage_min}+ yards`
                        : `Up to ${pattern.yardage_max} yards`
                    }
                  </p>
                </div>
              )}
              {(pattern.grams_min || pattern.grams_max) && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Grams:</h4>
                  <p className="text-sm text-gray-700">
                    {pattern.grams_min && pattern.grams_max 
                      ? `${pattern.grams_min} - ${pattern.grams_max} grams`
                      : pattern.grams_min 
                        ? `${pattern.grams_min}+ grams`
                        : `Up to ${pattern.grams_max} grams`
                    }
                  </p>
                </div>
              )}
              
              {/* PDF buttons for user patterns */}
              <div className="flex gap-2">
                {showEditButton && onEdit && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(pattern);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
                {pattern.google_drive_file_id && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const response = await fetch(`${API_CONFIG.baseUrl}/download-pdf/${pattern.pattern_id}`);
                          const data = await response.json();
                          
                          if (data.redirect_url) {
                            // This is a Google Drive file - open download URL
                            window.open(data.redirect_url, '_blank');
                          } else {
                            // This is a local file - open download URL
                            window.open(`${API_CONFIG.baseUrl}/download-pdf/${pattern.pattern_id}`, '_blank');
                          }
                        } catch (error) {
                          console.error('Error downloading PDF:', error);
                          alert('PDF could not be downloaded. Please try again.');
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download PDF
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const response = await fetch(`${API_CONFIG.baseUrl}/view-pdf/${pattern.pattern_id}`);
                          const data = await response.json();
                          
                          if (data.redirect_url) {
                            // This is a Google Drive file - open in new tab
                            window.open(data.redirect_url, '_blank');
                          } else {
                            // This is a local file - open in new tab
                            window.open(`${API_CONFIG.baseUrl}/view-pdf/${pattern.pattern_id}`, '_blank');
                          }
                        } catch (error) {
                          console.error('Error opening PDF:', error);
                          alert('PDF could not be loaded. Please try again.');
                        }
                      }}
                      className="bg-slate-700 hover:bg-slate-800 text-white"
                    >
                      Open PDF
                    </Button>
                  </>
                )}
                {showUploadButton && !pattern.google_drive_file_id && (
                  <div>
                    {showGoogleDrivePicker ? (
                      <GoogleDrivePicker
                        onFileSelect={handleGoogleDriveFileSelect}
                        onCancel={handleGoogleDriveCancel}
                        className="w-full"
                      />
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowGoogleDrivePicker(true);
                        }}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Link PDF
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {pattern.pattern_url && (
                <Button 
                  className="w-full bg-slate-700 hover:bg-slate-800 text-white" 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(pattern.pattern_url, '_blank');
                  }}
                >
                  Open Pattern Link
                </Button>
              )}
            </div>
          )}

        </div>
      </Card>

      {/* Detail Dialog for Patterns and Search pages */}
      {(variant === 'patterns' || variant === 'search') && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{pattern.name}</DialogTitle>
              <DialogDescription>
                Complete pattern details and information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Pattern Image */}
              <div className="flex justify-center">
                <img 
                  src={pattern.image || getPlaceholderUrl(pattern.craft_type)}
                  alt={pattern.name}
                  className="max-w-full h-64 object-cover rounded-lg shadow-md"
                />
              </div>
              
              {/* Pattern Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-1">Designer:</h4>
                  <p className="text-sm text-gray-700">{pattern.designer}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Price:</h4>
                  <p className="text-sm text-gray-700">{displayPrice}</p>
                </div>
                {pattern.project_type && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Project Type:</h4>
                    <p className="text-sm text-gray-700">{pattern.project_type}</p>
                  </div>
                )}
                {pattern.craft_type && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Craft Type:</h4>
                    <p className="text-sm text-gray-700">{pattern.craft_type}</p>
                  </div>
                )}
                {pattern.required_weight && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Yarn Weight:</h4>
                    <p className="text-sm text-gray-700">{pattern.required_weight}</p>
                  </div>
                )}
                {/* Stash Match Information */}
                {variant === 'patterns' && isStashMatch && yarnStash && yarnStash.length > 0 && pattern.required_weight && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Stash Match:</h4>
                    <div className="text-sm text-gray-700">
                      {pattern.held_yarn_description ? (
                        <p className="text-green-700">{pattern.held_yarn_description}</p>
                      ) : (() => {
                        // Calculate specific stash match descriptions
                        const matchDescriptions: string[] = [];
                        const weightMapping: { [key: string]: string[] } = {
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
                        };

                        const heldYarnCalculations: { [key: string]: { weight: string, description: string }[] } = {
                          'thread': [
                            { weight: 'Lace', description: '2 strands of thread = Lace weight' }
                          ],
                          'lace': [
                            { weight: 'Fingering (14 wpi)', description: '2 strands of lace = Fingering to Sport weight' },
                            { weight: 'Sport (12 wpi)', description: '2 strands of lace = Fingering to Sport weight' }
                          ],
                          'fingering': [
                            { weight: 'DK (11 wpi)', description: '2 strands of fingering = DK weight' }
                          ],
                          'sport': [
                            { weight: 'DK (11 wpi)', description: '2 strands of sport = DK or Light Worsted' },
                            { weight: 'Worsted (9 wpi)', description: '2 strands of sport = DK or Light Worsted' }
                          ],
                          'dk': [
                            { weight: 'Worsted (9 wpi)', description: '2 strands of DK = Worsted or Aran' },
                            { weight: 'Aran (8 wpi)', description: '2 strands of DK = Worsted or Aran' }
                          ],
                          'worsted': [
                            { weight: 'Bulky (7 wpi)', description: '2 strands of Worsted = Chunky' }
                          ],
                          'aran': [
                            { weight: 'Bulky (7 wpi)', description: '2 strands of Aran = Chunky to Super Bulky' },
                            { weight: 'Super Bulky (5-6 wpi)', description: '2 strands of Aran = Chunky to Super Bulky' }
                          ],
                          'bulky': [
                            { weight: 'Super Bulky (5-6 wpi)', description: '2 strands of Chunky = Super Bulky to Jumbo' },
                            { weight: 'Jumbo (0-4 wpi)', description: '2 strands of Chunky = Super Bulky to Jumbo' }
                          ]
                        };

                        const normalizeWeight = (weight: string): string => {
                          return weight.toLowerCase().replace(/\s*\(\d+\s*wpi\)/, '');
                        };

                        const checkWeightMatch = (stashWeight: string, patternWeight: string): { matches: boolean, description?: string } => {
                          const stashNormalized = normalizeWeight(stashWeight);
                          const patternNormalized = normalizeWeight(patternWeight);
                          
                          // Direct match
                          if (stashNormalized === patternNormalized) {
                            return { matches: true, description: `${stashWeight} (direct match)` };
                          }
                          
                          // Check weight mapping
                          const possiblePatternWeights = (weightMapping[stashWeight] || []).map(w => normalizeWeight(w));
                          if (possiblePatternWeights.includes(patternNormalized)) {
                            return { matches: true, description: `${stashWeight} (direct match)` };
                          }
                          
                          // Check reverse mapping
                          const possibleStashWeights = (weightMapping[patternWeight] || []).map(w => normalizeWeight(w));
                          if (possibleStashWeights.includes(stashNormalized)) {
                            return { matches: true, description: `${stashWeight} (direct match)` };
                          }
                          
                          // Check held yarn calculations
                          const heldCalculations = heldYarnCalculations[stashNormalized];
                          if (heldCalculations) {
                            for (const calc of heldCalculations) {
                              if (normalizeWeight(calc.weight) === patternNormalized) {
                                return { matches: true, description: calc.description };
                              }
                            }
                          }
                          
                          // Check partial matching for cases like "fingering" vs "Fingering (14 wpi)"
                          if (patternNormalized.includes(stashNormalized) || stashNormalized.includes(patternNormalized)) {
                            return { matches: true, description: `${stashWeight} (direct match)` };
                          }
                          
                          return { matches: false };
                        };

                        // Check each yarn in stash
                        for (const yarn of yarnStash) {
                          const weightCheck = checkWeightMatch(yarn.weight, pattern.required_weight);
                          if (weightCheck.matches && weightCheck.description) {
                            matchDescriptions.push(weightCheck.description);
                          }
                        }

                        return matchDescriptions.length > 0 ? (
                          <p className="text-green-700">{[...new Set(matchDescriptions)].join(', ')}</p>
                        ) : (
                          <p className="text-green-700">Pattern matches your stash!</p>
                        );
                      })()}
                    </div>
                  </div>
                )}
                {(pattern.yardage_min || pattern.yardage_max) && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Yardage:</h4>
                    <p className="text-sm text-gray-700">
                      {pattern.yardage_min && pattern.yardage_max 
                        ? `${pattern.yardage_min} - ${pattern.yardage_max} yards`
                        : pattern.yardage_min 
                          ? `${pattern.yardage_min}+ yards`
                          : `Up to ${pattern.yardage_max} yards`
                      }
                    </p>
                  </div>
                )}
                {(pattern.grams_min || pattern.grams_max) && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Grams:</h4>
                    <p className="text-sm text-gray-700">
                      {pattern.grams_min && pattern.grams_max 
                        ? `${pattern.grams_min} - ${pattern.grams_max} grams`
                        : pattern.grams_min 
                          ? `${pattern.grams_min}+ grams`
                          : `Up to ${pattern.grams_max} grams`
                      }
                    </p>
                  </div>
                )}
                {pattern.google_drive_file_id && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">PDF File:</h4>
                    <p className="text-sm text-gray-700">{pattern.google_drive_file_id}</p>
                  </div>
                )}
              </div>
              
              {pattern.description && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Description:</h4>
                  <p className="text-sm text-gray-700">{pattern.description}</p>
                </div>
              )}
              
              {/* PDF Viewer */}
              {pattern.google_drive_file_id && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                    <h4 className="font-medium text-sm">PDF Pattern</h4>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await fetch(`${API_CONFIG.baseUrl}/view-pdf/${pattern.pattern_id}`);
                            const data = await response.json();
                            
                            if (data.redirect_url) {
                              // This is a Google Drive file - open in new tab
                              window.open(data.redirect_url, '_blank');
                            } else {
                              // This is a local file - open in new tab
                              window.open(`${API_CONFIG.baseUrl}/view-pdf/${pattern.pattern_id}`, '_blank');
                            }
                          } catch (error) {
                            console.error('Error opening PDF:', error);
                            alert('PDF could not be loaded. Please try again.');
                          }
                        }}
                        className="h-6 px-2 text-xs bg-black hover:bg-gray-800 !bg-opacity-100"
                      >
                        Open PDF
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsPdfFullScreen(!isPdfFullScreen)}
                        className="h-6 w-6 p-0"
                      >
                        {isPdfFullScreen ? (
                          <Minimize2 className="h-4 w-4" />
                        ) : (
                          <Maximize2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className={isPdfFullScreen ? "h-[80vh]" : "h-96"}>
                    <iframe
                      src={`https://drive.google.com/file/d/${pattern.google_drive_file_id}/preview`}
                      className="w-full h-full"
                      title="PDF Pattern"
                      onError={() => {
                        alert('PDF could not be loaded. Please check if the Google Drive file is still accessible.');
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                {showEditButton && onEdit && (
                  <Button 
                    variant="outline"
                    onClick={() => onEdit(pattern)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Pattern
                  </Button>
                )}
                {showDownloadButton && pattern.google_drive_file_id && (
                  <Button 
                    variant="outline"
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_CONFIG.baseUrl}/download-pdf/${pattern.pattern_id}`);
                        if (response.ok) {
                          const data = await response.json();
                          if (data.redirect_url) {
                            // For Google Drive files, open the redirect URL
                            window.open(data.redirect_url, '_blank');
                          } else {
                            // For local files, open the direct URL
                            window.open(`${API_CONFIG.baseUrl}/download-pdf/${pattern.pattern_id}`, '_blank');
                          }
                        } else {
                          console.error('Download failed:', response.status);
                        }
                      } catch (error) {
                        console.error('Download error:', error);
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                )}
                {showUploadButton && !pattern.google_drive_file_id && (
                  <div>
                    {showGoogleDrivePicker ? (
                      <GoogleDrivePicker
                        onFileSelect={handleGoogleDriveFileSelect}
                        onCancel={handleGoogleDriveCancel}
                        className="w-full"
                      />
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowGoogleDrivePicker(true);
                        }}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Link PDF
                      </Button>
                    )}
                  </div>
                )}
                {showDeleteButton && onDelete && (
                  <Button 
                    onClick={handleDeleteClick}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Pattern
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Pattern</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{pattern.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Yarns Dialog - now inside the Card */}
      <UIDialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <UIDialogContent className="max-w-lg">
          <UIDialogHeader>
            <UIDialogTitle>Matching Yarns for: {selectedMatchDescription}</UIDialogTitle>
          </UIDialogHeader>
          <div className="space-y-3 mt-2">
            {selectedMatchYarns.length === 0 ? (
              <div className="text-gray-500">No matching yarns found.</div>
            ) : (
              selectedMatchYarns.map((yarn, idx) => (
                <div key={yarn.id || idx} className="border rounded p-2 bg-gray-50">
                  <div className="font-medium">{yarn.yarnName}</div>
                  <div className="text-xs text-gray-600">Brand: {yarn.brand}</div>
                  <div className="text-xs text-gray-600">Weight: {yarn.weight}</div>
                  <div className="text-xs text-gray-600">Yardage: {yarn.yardage} yd</div>
                  <div className="text-xs text-gray-600">Grams: {yarn.grams} g</div>
                  <div className="text-xs text-gray-600">Fiber: {yarn.fiber}</div>
                </div>
              ))
            )}
          </div>
        </UIDialogContent>
      </UIDialog>
    </>
  );
};

export default PatternCard; 