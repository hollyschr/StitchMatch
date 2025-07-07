import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Package, Trash2, Download, Upload, Maximize2, Minimize2, Heart, Edit } from 'lucide-react';
import API_CONFIG from '@/config/api';

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
  pdf_file?: string;
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
  showDownloadButton?: boolean;
  showEditButton?: boolean;
  onEdit?: (pattern: Pattern) => void;
  variant?: 'search' | 'patterns';
  showFavoriteButton?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: (patternId: number) => void;
  cardSize?: 'default' | 'small';
}

const PatternCard = ({ 
  pattern, 
  yarnStash = [], 
  isStashMatchingMode = false,
  showDeleteButton = false,
  onDelete,
  showUploadButton = false,
  onUploadPdf,
  showDownloadButton = false,
  showEditButton = false,
  onEdit,
  variant = 'search',
  showFavoriteButton = false,
  isFavorited = false,
  onToggleFavorite,
  cardSize = 'default',
}: PatternCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isPdfFullScreen, setIsPdfFullScreen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Ensure price is always a string and fallback to 'Free' if missing
  // For user-uploaded patterns (with pdf_file), show 'Owned' instead of 'Free'
  const displayPrice = pattern.pdf_file
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

    // Calculate total yardage for the required weight class
    const matchingYarns = yarnStash.filter(yarn => {
      // Normalize weights for comparison
      const yarnWeightLower = yarn.weight.toLowerCase();
      const patternWeightLower = pattern.required_weight.toLowerCase();
      
      // Check if this yarn's weight matches the pattern's required weight
      // First, try direct mapping from stash weight to pattern weights
      const possiblePatternWeights = (weightMapping[yarn.weight] || []).map(w => w.toLowerCase());
      if (possiblePatternWeights.includes(patternWeightLower)) {
        return true;
      }
      
      // Second, try reverse mapping - check if pattern weight maps to stash weight
      const possibleStashWeights = (weightMapping[pattern.required_weight] || []).map(w => w.toLowerCase());
      if (possibleStashWeights.includes(yarnWeightLower)) {
        return true;
      }
      
      // Third, try direct string matching (case-insensitive)
      if (yarnWeightLower === patternWeightLower) {
        return true;
      }
      
      // Fourth, try partial matching for cases like "fingering" vs "Fingering (14 wpi)"
      if (patternWeightLower.includes(yarnWeightLower) || yarnWeightLower.includes(patternWeightLower)) {
        return true;
      }
      
      return false;
    });
    
    const totalYardage = matchingYarns.reduce((sum, yarn) => sum + yarn.yardage, 0);

    if (totalYardage === 0) {
      return false; // No yarn in this weight class
    }

    // Handle different yardage scenarios
    const hasMinYardage = pattern.yardage_min !== null && pattern.yardage_min !== undefined;
    const hasMaxYardage = pattern.yardage_max !== null && pattern.yardage_max !== undefined;
    
    if (hasMinYardage && hasMaxYardage) {
      // Both min and max yardage - stash must be at least as much as max
      return totalYardage >= pattern.yardage_max;
    }
    
    if (hasMinYardage) {
      // Only min yardage - stash must have at least this much
      return totalYardage >= pattern.yardage_min;
    }
    
    if (hasMaxYardage) {
      // Only max yardage - stash must be at least as much as max
      return totalYardage >= pattern.yardage_max;
    }
    
    return false; // Shouldn't reach here, but just in case
  };

  // If we're in stash matching mode, all patterns shown should be green
  // Otherwise, use the individual pattern matching logic
  const isStashMatch = isStashMatchingMode || matchesStash();

  const handleCardClick = () => {
    if (variant === 'patterns') {
      setIsDetailDialogOpen(true);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onUploadPdf) {
      onUploadPdf(pattern.pattern_id, file);
    }
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

  return (
    <>
      <Card className={`overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
        isStashMatch ? 'bg-green-100 border-green-400' : ''
      } ${variant === 'patterns' ? 'h-full flex flex-col' : ''} ${cardSize === 'small' ? 'max-w-xs p-2' : ''}`} onClick={handleCardClick}>
        <img 
          src={pattern.image || "/placeholder.svg"}
          alt={pattern.name}
          className={`w-full object-cover bg-gray-200 ${
            cardSize === 'small' ? 'h-24' : (variant === 'patterns' ? 'h-32' : 'h-48')
          }`}
        />
        <div className={`${cardSize === 'small' ? 'p-2' : (variant === 'patterns' ? 'p-3 flex-1 flex flex-col' : 'p-4')}`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className={`font-semibold ${
              cardSize === 'small' ? 'text-xs leading-tight' : (variant === 'patterns' ? 'text-sm leading-tight' : 'text-lg')
            }`}>{pattern.name}</h3>
            <div className="flex items-center gap-1">
              {isStashMatch && (
                <div className="flex items-center gap-1 text-xs text-green-800 bg-green-200 px-2 py-1 rounded">
                  <Package className="h-3 w-3" />
                  <span>Match</span>
                </div>
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
              {pattern.pdf_file && (
                <p className="text-green-600 font-medium">✓ PDF Available</p>
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
              {isExpanded ? 'Hide Details' : 'View Details'}
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
              {pattern.pdf_file ? (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-xs flex-1 mx-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`${API_CONFIG.baseUrl}/download-pdf/${pattern.pattern_id}`, '_blank');
                  }}
                >
                  <Download className="h-3 w-3 mr-1" />
                  PDF
                </Button>
              ) : showUploadButton ? (
                <div className="relative flex-1 mx-1">
                  <input
                    type="file"
                    accept=".pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button variant="ghost" size="sm" className="text-xs w-full">
                    <Upload className="h-3 w-3 mr-1" />
                    Upload
                  </Button>
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
              {pattern.required_weight && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Yarn Weight:</h4>
                  <p className="text-sm text-gray-700">{pattern.required_weight}</p>
                </div>
              )}
              <div>
                <h4 className="font-medium text-sm mb-1">Price:</h4>
                <p className="text-sm text-gray-700">{displayPrice}</p>
              </div>
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
                {showDownloadButton && pattern.pdf_file && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`${API_CONFIG.baseUrl}/download-pdf/${pattern.pattern_id}`, '_blank');
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download PDF
                  </Button>
                )}
                {showUploadButton && !pattern.pdf_file && (
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileUpload}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-1" />
                      Upload PDF
                    </Button>
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
                {showDownloadButton && pattern.pdf_file && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`${API_CONFIG.baseUrl}/download-pdf/${pattern.pattern_id}`, '_blank');
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download PDF
                  </Button>
                )}
                {pattern.pdf_file && (
                  <Button 
                    variant="default" 
                    onClick={(e) => {
                      e.stopPropagation();
                      const pdfWindow = window.open(`${API_CONFIG.baseUrl}/view-pdf/${pattern.pattern_id}`, '_blank');
                      if (pdfWindow) {
                        pdfWindow.onerror = () => {
                          alert('PDF could not be loaded. The file may have been lost due to server restart. Please re-upload the PDF.');
                        };
                      }
                    }}
                    className="w-full bg-black hover:bg-gray-800 !bg-opacity-100"
                  >
                    Open PDF
                  </Button>
                )}
                {showUploadButton && !pattern.pdf_file && (
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileUpload}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-1" />
                      Upload PDF
                    </Button>
                  </div>
                )}
              </div>
              
              {pattern.pattern_url && (
                <Button 
                  className="w-full" 
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

      {/* Detail Dialog for Patterns page */}
      {variant === 'patterns' && (
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
                  src={pattern.image || "/placeholder.svg"}
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
                {pattern.pdf_file && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">PDF File:</h4>
                    <p className="text-sm text-gray-700">{pattern.pdf_file}</p>
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
              {pattern.pdf_file && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                    <h4 className="font-medium text-sm">PDF Pattern</h4>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          const pdfWindow = window.open(`${API_CONFIG.baseUrl}/view-pdf/${pattern.pattern_id}`, '_blank');
                          if (pdfWindow) {
                            pdfWindow.onerror = () => {
                              alert('PDF could not be loaded. The file may have been lost due to server restart. Please re-upload the PDF.');
                            };
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
                      src={`${API_CONFIG.baseUrl}/view-pdf/${pattern.pattern_id}`}
                      className="w-full h-full"
                      title="PDF Pattern"
                      onError={() => {
                        alert('PDF could not be loaded. The file may have been lost due to server restart. Please re-upload the PDF.');
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
                {showDownloadButton && pattern.pdf_file && (
                  <Button 
                    variant="outline"
                    onClick={() => window.open(`${API_CONFIG.baseUrl}/download-pdf/${pattern.pattern_id}`, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                )}
                {showUploadButton && !pattern.pdf_file && (
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileUpload}
                    />
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload PDF
                    </Button>
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
    </>
  );
};

export default PatternCard; 