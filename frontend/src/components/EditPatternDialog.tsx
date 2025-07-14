import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useToast } from '../hooks/use-toast';
import { API_CONFIG } from '../config/api';
import { Upload, X } from 'lucide-react';
import GoogleDrivePicker from './GoogleDrivePicker';

interface Pattern {
  pattern_id: number;
  name: string;
  designer: string;
  image: string;
  description?: string;
  project_type?: string;
  craft_type?: string;
  required_weight?: string;
  yardage_min?: number;
  yardage_max?: number;
  grams_min?: number;
  grams_max?: number;
  google_drive_file_id?: string;
}

interface EditPatternDialogProps {
  pattern: Pattern;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  userId: number;
}

const CRAFT_TYPES = [
  'Crochet',
  'Knit',
  'Tunisian Crochet',
  'Amigurumi',
  'Tapestry Crochet',
  'Filet Crochet',
  'Broomstick Lace',
  'Hairpin Lace',
  'Irish Crochet',
  'Other'
];

const PROJECT_TYPES = [
  'Sweater',
  'Cardigan',
  'Shawl',
  'Scarf',
  'Hat',
  'Gloves',
  'Mittens',
  'Socks',
  'Blanket',
  'Pillow',
  'Bag',
  'Toy',
  'Dress',
  'Skirt',
  'Pants',
  'Shorts',
  'Coat',
  'Vest',
  'Cowl',
  'Headband',
  'Other'
];

const YARN_WEIGHTS = [
  'Lace (0)',
  'Super Fine (1)',
  'Fine (2)',
  'Light (3)',
  'Medium (4)',
  'Bulky (5)',
  'Super Bulky (6)',
  'Jumbo (7)',
  'Thread',
  'Cobweb',
  'Fingering (14 wpi)',
  'Sport (12 wpi)',
  'DK (11 wpi)',
  'Worsted (9 wpi)',
  'Aran (8 wpi)',
  'Chunky (7 wpi)',
  'Super Chunky (6 wpi)',
  'Roving (3 wpi)'
];

export const EditPatternDialog: React.FC<EditPatternDialogProps> = ({
  pattern,
  isOpen,
  onClose,
  onUpdate,
  userId
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGoogleDriveFile, setSelectedGoogleDriveFile] = useState<{id: string, name: string} | null>(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [formData, setFormData] = useState({
    name: pattern.name,
    designer: pattern.designer,
    image: pattern.image,
    description: pattern.description || '',
    project_type: pattern.project_type || '',
    craft_type: pattern.craft_type || '',
    required_weight: pattern.required_weight || '',
    yardage_min: pattern.yardage_min?.toString() || '',
    yardage_max: pattern.yardage_max?.toString() || '',
    grams_min: pattern.grams_min?.toString() || '',
    grams_max: pattern.grams_max?.toString() || ''
  });

  // Helper function to get placeholder URL based on craft type
  const getPlaceholderUrl = (craftType: string) => {
    return "https://t4.ftcdn.net/jpg/04/70/97/15/360_F_470971535_tR6xzNu1ogTUuv1ymANFS1Maqf8pBjVd.jpg";
  };

  useEffect(() => {
    setFormData({
      name: pattern.name,
      designer: pattern.designer,
      image: pattern.image,
      description: pattern.description || '',
      project_type: pattern.project_type || '',
      craft_type: pattern.craft_type || '',
      required_weight: pattern.required_weight || '',
      yardage_min: pattern.yardage_min?.toString() || '',
      yardage_max: pattern.yardage_max?.toString() || '',
      grams_min: pattern.grams_min?.toString() || '',
      grams_max: pattern.grams_max?.toString() || ''
    });
  }, [pattern]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGoogleDriveFileSelect = (file: {id: string, name: string}) => {
    setSelectedGoogleDriveFile(file);
    setRemovePdf(false);
  };

  const handleRemovePdf = () => {
    setRemovePdf(true);
    setSelectedGoogleDriveFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First, update the pattern data
      const response = await fetch(`${API_CONFIG.baseUrl}/users/${userId}/patterns/${pattern.pattern_id}/?timestamp=${Date.now()}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          designer: formData.designer,
          image: formData.image || getPlaceholderUrl(formData.craft_type),
          google_drive_file_id: removePdf ? null : (selectedGoogleDriveFile ? selectedGoogleDriveFile.id : pattern.google_drive_file_id),
          description: formData.description || undefined,
          project_type: formData.project_type || undefined,
          craft_type: formData.craft_type || undefined,
          required_weight: formData.required_weight || undefined,
          yardage_min: formData.yardage_min ? parseFloat(formData.yardage_min) : undefined,
          yardage_max: formData.yardage_max ? parseFloat(formData.yardage_max) : undefined,
          grams_min: formData.grams_min ? parseFloat(formData.grams_min) : undefined,
          grams_max: formData.grams_max ? parseFloat(formData.grams_max) : undefined
        })
      });

      if (response.ok) {
        // Google Drive file is already linked via the file ID
        // No need to upload since we're storing the Google Drive file ID

        // Remove PDF if requested
        if (removePdf && pattern.google_drive_file_id) {
          // Note: We don't have a delete PDF endpoint, so we just update the database
          // The file will remain on disk but won't be associated with the pattern
        }

        toast({
          title: "Success",
          description: "Pattern updated successfully!",
        });
        onUpdate();
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update pattern');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update pattern',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Pattern</DialogTitle>
          <DialogDescription>
            Update the details for "{pattern.name}"
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Pattern Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="designer">Designer *</Label>
              <Input
                id="designer"
                value={formData.designer}
                onChange={(e) => handleInputChange('designer', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image URL (optional)</Label>
            <Input
              id="image"
              value={formData.image}
              onChange={(e) => handleInputChange('image', e.target.value)}
              placeholder="https://example.com/image.jpg (optional)"
            />
          </div>

          {/* PDF Management */}
          <div className="space-y-2">
            <Label>PDF Pattern File</Label>
            <div className="space-y-2">
              {pattern.google_drive_file_id && !removePdf && !selectedGoogleDriveFile && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                  <span className="text-sm text-gray-700">{pattern.google_drive_file_id}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemovePdf}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {selectedGoogleDriveFile && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                  <span className="text-sm text-blue-700">{selectedGoogleDriveFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedGoogleDriveFile(null)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {(!pattern.google_drive_file_id || removePdf) && !selectedGoogleDriveFile && (
                <GoogleDrivePicker
                  onFileSelect={handleGoogleDriveFileSelect}
                  className="mt-2"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Optional pattern description..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="craft_type">Craft Type</Label>
              <Select value={formData.craft_type} onValueChange={(value) => handleInputChange('craft_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select craft type" />
                </SelectTrigger>
                <SelectContent>
                  {CRAFT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_type">Project Type</Label>
              <Select value={formData.project_type} onValueChange={(value) => handleInputChange('project_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="required_weight">Yarn Weight</Label>
            <Select value={formData.required_weight} onValueChange={(value) => handleInputChange('required_weight', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select yarn weight" />
              </SelectTrigger>
              <SelectContent>
                {YARN_WEIGHTS.map((weight) => (
                  <SelectItem key={weight} value={weight}>
                    {weight}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="yardage_min">Minimum Yardage</Label>
              <Input
                id="yardage_min"
                type="number"
                value={formData.yardage_min}
                onChange={(e) => handleInputChange('yardage_min', e.target.value)}
                placeholder="e.g., 200"
                min="0"
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yardage_max">Maximum Yardage</Label>
              <Input
                id="yardage_max"
                type="number"
                value={formData.yardage_max}
                onChange={(e) => handleInputChange('yardage_max', e.target.value)}
                placeholder="e.g., 400"
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grams_min">Minimum Grams</Label>
              <Input
                id="grams_min"
                type="number"
                value={formData.grams_min}
                onChange={(e) => handleInputChange('grams_min', e.target.value)}
                placeholder="e.g., 50"
                min="0"
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grams_max">Maximum Grams</Label>
              <Input
                id="grams_max"
                type="number"
                value={formData.grams_max}
                onChange={(e) => handleInputChange('grams_max', e.target.value)}
                placeholder="e.g., 100"
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Pattern'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 