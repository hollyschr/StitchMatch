import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Book, Trash2, LogOut, Heart, Pin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import PatternCard from '@/components/PatternCard';
import { EditPatternDialog } from '@/components/EditPatternDialog';
import GoogleDrivePicker from '@/components/GoogleDrivePicker';
import API_CONFIG from '@/config/api';

interface User {
  user_id: number;
  name: string;
  email: string;
  profile_photo?: string;
}

interface UserPattern {
  pattern_id: number;
  name: string;
  designer: string;
  image: string;
  google_drive_file_id?: string;  // Google Drive file ID
  // Metadata fields (these will be stored in normalized tables)
  yardage_min?: number;
  yardage_max?: number;
  grams_min?: number;
  grams_max?: number;
  price?: string;
  project_type?: string;
  craft_type?: string;
  required_weight?: string;
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

const Patterns = () => {
  const [userPatterns, setUserPatterns] = useState<UserPattern[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGoogleDriveFile, setSelectedGoogleDriveFile] = useState<{id: string, name: string} | null>(null);
  const [filterCraft, setFilterCraft] = useState<string>('all');
  const [filterPdf, setFilterPdf] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [favoritedPatterns, setFavoritedPatterns] = useState<Set<number>>(new Set());
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [patternToEdit, setPatternToEdit] = useState<UserPattern | null>(null);
  const [yarnStash, setYarnStash] = useState<YarnStash[]>([]);
  const [wipPatternIds, setWipPatternIds] = useState<Set<number>>(new Set());
  const [isWipDialogOpen, setIsWipDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Patterns component mounted');
    
    // Check if user is logged in
    const savedUser = localStorage.getItem('currentUser');
    console.log('Saved user from localStorage:', savedUser);
    
    if (!savedUser) {
      console.log('No saved user, redirecting to home');
      navigate('/');
      return;
    }
    
    try {
      const user: User = JSON.parse(savedUser);
      console.log('Parsed user:', user);
      setCurrentUser(user);
      
      // Fetch user's patterns
      console.log('Fetching patterns for user:', user.user_id);
      fetch(`${API_CONFIG.endpoints.users}/${user.user_id}/patterns/`)
        .then(res => {
          console.log('Response status:', res.status);
          if (res.ok) {
            return res.json();
          } else {
            throw new Error('Failed to fetch patterns');
          }
        })
        .then(data => {
          console.log('Fetched patterns:', data);
          setUserPatterns(data);
          
          // Load yarn stash for stash matching
          return fetch(`${API_CONFIG.endpoints.users}/${user.user_id}/yarn`);
        })
        .then(response => {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error('Failed to fetch yarn stash');
          }
        })
        .then(data => {
          const transformedYarn = data.yarn ? data.yarn.map((yarn: any) => ({
            id: yarn.yarn_id,
            yarnName: yarn.yarn_name,
            brand: yarn.brand,
            weight: yarn.weight,
            fiber: yarn.fiber,
            yardage: yarn.yardage,
            grams: yarn.grams
          })) : [];
          setYarnStash(transformedYarn);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching data:', error);
          toast({ title: "Error loading data" });
          setIsLoading(false);
        });
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/');
    }
  }, [navigate]);

  // Load favorited patterns on mount
  useEffect(() => {
    const loadFavoritedPatterns = async () => {
      const savedUser = localStorage.getItem('currentUser');
      if (!savedUser) return;
      try {
        const user = JSON.parse(savedUser);
        const response = await fetch(`${API_CONFIG.endpoints.users}/${user.user_id}/favorites/?page=1&page_size=1000`);
        if (response.ok) {
          const data = await response.json();
          const favoritedIds = new Set<number>(data.patterns.map((p: any) => p.pattern_id as number));
          setFavoritedPatterns(favoritedIds);
        }
      } catch (error) {
        console.error('Error loading favorited patterns:', error);
      }
    };
    loadFavoritedPatterns();
  }, []);

  // Fetch WIP pattern IDs on mount
  useEffect(() => {
    if (!currentUser) return;
    fetch(`${API_CONFIG.endpoints.users}/${currentUser.user_id}/wip`)
      .then(res => res.json())
      .then(ids => setWipPatternIds(new Set(ids)))
      .catch(() => setWipPatternIds(new Set()));
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    navigate('/');
    toast({ title: "Logged out successfully" });
  };

  const addPattern = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) {
      toast({ title: "Please log in first" });
      return;
    }

    const formData = new FormData(event.currentTarget);
  
    // Helper function to convert "any" to undefined and handle empty strings
    const getValueOrUndefined = (value: string | null) => {
      if (value === "any" || value === "" || value === null) {
        return undefined;
      }
      return value;
    };

    // Helper function to parse numbers safely
    const parseNumber = (value: string | null) => {
      if (!value || value === "" || value === "any") {
        return undefined;
      }
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : parsed;
    };
  
    // Helper function to get placeholder URL based on craft type
    const getPlaceholderUrl = (craftType?: string) => {
      return "https://t4.ftcdn.net/jpg/04/70/97/15/360_F_470971535_tR6xzNu1ogTUuv1ymANFS1Maqf8pBjVd.jpg";
    };

    // Build pattern object with proper type handling
    const rawPattern = {
      name: formData.get('name') as string,
      designer: formData.get('designer') as string,
      image: formData.get('image') as string || getPlaceholderUrl(formData.get('craftType') as string),
      google_drive_file_id: selectedGoogleDriveFile ? selectedGoogleDriveFile.id : undefined,
      yardage_min: parseNumber(formData.get('yardageMin') as string),
      yardage_max: parseNumber(formData.get('yardageMax') as string),
      grams_min: parseNumber(formData.get('gramsMin') as string),
      grams_max: parseNumber(formData.get('gramsMax') as string),
      project_type: getValueOrUndefined(formData.get('projectType') as string),
      craft_type: getValueOrUndefined(formData.get('craftType') as string),
      required_weight: getValueOrUndefined(formData.get('requiredWeight') as string),
    };

    // Remove undefined and null fields
    const newPattern = Object.fromEntries(
      Object.entries(rawPattern).filter(([_, v]) => v !== undefined && v !== null && v !== "")
    );

    console.log('Sending pattern data:', newPattern);
  
    try {
      const response = await fetch(`${API_CONFIG.endpoints.users}/${currentUser.user_id}/patterns/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPattern),
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Pattern added successfully:', result);
        const patternId = result.pattern_id;
        
        // Google Drive file is already linked via the file ID
        // No need to upload since we're storing the Google Drive file ID
        
        // Refresh the list
        const updatedPatterns = await fetch(`${API_CONFIG.endpoints.users}/${currentUser.user_id}/patterns/`);
        const patterns = await updatedPatterns.json();
        setUserPatterns(patterns);
        
        // Reset form
        setSelectedGoogleDriveFile(null);
        setIsDialogOpen(false);
        toast({ title: "Pattern added successfully!" });
      } else {
        const errorText = await response.text();
        console.error('Failed to add pattern:', response.status, errorText);
        toast({ title: "Failed to add pattern", description: errorText });
      }
    } catch (error) {
      console.error('Error adding pattern:', error);
      toast({ title: "Error adding pattern" });
    }
  };

  const removePattern = async (id: number) => {
    if (!currentUser) {
      toast({ title: "Please log in first" });
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.endpoints.users}/${currentUser.user_id}/patterns/${id}/`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from local state
        setUserPatterns(userPatterns.filter(pattern => pattern.pattern_id !== id));
        toast({ title: "Pattern removed successfully" });
      } else {
        toast({ title: "Failed to remove pattern" });
      }
    } catch (error) {
      console.error('Error removing pattern:', error);
      toast({ title: "Error removing pattern" });
    }
  };

  const uploadPdfToPattern = async (patternId: number, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_CONFIG.baseUrl}/upload-pdf/${patternId}`, {
        method: "POST",
        body: formData,
      });
      
      if (response.ok) {
        // Refresh the patterns list
        const updatedPatterns = await fetch(`${API_CONFIG.endpoints.users}/${currentUser!.user_id}/patterns/`);
        const patterns = await updatedPatterns.json();
        setUserPatterns(patterns);
        toast({ title: "PDF uploaded successfully!" });
      } else {
        toast({ title: "Failed to upload PDF" });
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast({ title: "Error uploading PDF" });
    }
  };

  // Toggle favorite status for a pattern
  const handleEditPattern = (pattern: UserPattern) => {
    setPatternToEdit(pattern);
    setIsEditDialogOpen(true);
  };

  const handlePatternUpdated = () => {
    // Refresh the patterns list
    if (currentUser) {
      fetch(`${API_CONFIG.endpoints.users}/${currentUser.user_id}/patterns/`)
        .then(res => {
          if (res.ok) {
            return res.json();
          } else {
            throw new Error('Failed to fetch patterns');
          }
        })
        .then(data => {
          setUserPatterns(data);
        })
        .catch(error => {
          console.error('Error fetching patterns:', error);
          toast({ title: "Error refreshing patterns" });
        });
    }
  };

  const handleToggleFavorite = async (patternId: number) => {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
      toast({ 
        title: "Not logged in", 
        description: "Please log in to favorite patterns." 
      });
      return;
    }
    try {
      const user = JSON.parse(savedUser);
      const isCurrentlyFavorited = favoritedPatterns.has(patternId);
      const response = await fetch(`${API_CONFIG.endpoints.users}/${user.user_id}/favorites/${patternId}/`, {
        method: isCurrentlyFavorited ? 'DELETE' : 'POST',
      });
      if (response.ok) {
        if (isCurrentlyFavorited) {
          setFavoritedPatterns(prev => {
            const newSet = new Set(prev);
            newSet.delete(patternId);
            return newSet;
          });
          toast({ title: "Removed from favorites" });
        } else {
          setFavoritedPatterns(prev => new Set(prev).add(patternId));
          toast({ title: "Added to favorites" });
        }
      } else {
        throw new Error('Failed to update favorite');
      }
    } catch (error) {
      toast({ title: "Error updating favorite" });
    }
  };

  const handleToggleWip = async (patternId: number) => {
    if (!currentUser) return;
    const isWip = wipPatternIds.has(patternId);
    if (isWip) {
      await fetch(`${API_CONFIG.endpoints.users}/${currentUser.user_id}/wip/${patternId}`, { method: 'DELETE' });
      setWipPatternIds(prev => {
        const next = new Set(prev);
        next.delete(patternId);
        return next;
      });
    } else {
      await fetch(`${API_CONFIG.endpoints.users}/${currentUser.user_id}/wip/${patternId}`, { method: 'POST' });
      setWipPatternIds(prev => new Set(prev).add(patternId));
    }
  };

  // Filter and sort patterns
  const filteredAndSortedPatterns = userPatterns
    .filter(pattern => {
      if (filterCraft !== 'all' && pattern.craft_type !== filterCraft) return false;
      if (filterPdf === 'with-pdf' && !pattern.google_drive_file_id) return false;
      if (filterPdf === 'without-pdf' && pattern.google_drive_file_id) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'designer':
          return a.designer.localeCompare(b.designer);
        case 'craft':
          return (a.craft_type || '').localeCompare(b.craft_type || '');
        case 'type':
          return (a.project_type || '').localeCompare(b.project_type || '');
        case 'pdf':
          return (b.google_drive_file_id ? 1 : 0) - (a.google_drive_file_id ? 1 : 0);
        default:
          return 0;
      }
    });

  console.log('Rendering Patterns component. currentUser:', currentUser, 'isLoading:', isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E2F0FA] via-[#F9F9F6] to-[#FDFCFB] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-gray-600">Please wait while we load your patterns.</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E2F0FA] via-[#F9F9F6] to-[#FDFCFB] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Not logged in</h2>
          <p className="text-gray-600">Please log in to view your patterns.</p>
          <Button onClick={() => navigate('/login')} className="mt-4">Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E2F0FA] via-[#F9F9F6] to-[#FDFCFB]">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">My Patterns</h1>
              <p className="text-gray-600">Manage your pattern collection</p>
              <p className="text-sm text-gray-500">Welcome, {currentUser.name}!</p>
            </div>
            <div className="flex gap-8">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700 !bg-opacity-100">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Pattern
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Pattern</DialogTitle>
                    <DialogDescription>
                      Add a new pattern to your collection. Fill in the details below.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={addPattern} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Pattern Name</Label>
                      <Input id="name" name="name" required />
                    </div>
                    <div>
                      <Label htmlFor="designer">Designer</Label>
                      <Input id="designer" name="designer" required />
                    </div>
                    <div>
                      <Label htmlFor="image">Image URL (optional)</Label>
                      <Input id="image" name="image" type="url" placeholder="https://..." />
                    </div>
                    <div>
                      <Label>PDF Pattern File (optional)</Label>
                      {selectedGoogleDriveFile ? (
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                          <span className="text-sm text-blue-700">{selectedGoogleDriveFile.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedGoogleDriveFile(null)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <GoogleDrivePicker
                          onFileSelect={(file) => setSelectedGoogleDriveFile({id: file.id, name: file.name})}
                          className="mt-2"
                        />
                      )}
                    </div>
                    
                    {/* Metadata Fields */}
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-medium mb-4">Pattern Details</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="projectType">Project Type</Label>
                          <Select name="projectType">
                            <SelectTrigger>
                              <SelectValue placeholder="Select project type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">Any Project</SelectItem>
                              <SelectItem value="child">Child</SelectItem>
                              <SelectItem value="hat">Hat</SelectItem>
                              <SelectItem value="baby">Baby</SelectItem>
                              <SelectItem value="socks">Socks</SelectItem>
                              <SelectItem value="shawl-wrap">Shawl/Wrap</SelectItem>
                              <SelectItem value="scarf">Scarf</SelectItem>
                              <SelectItem value="home">Home</SelectItem>
                              <SelectItem value="mittens-gloves">Mittens/Gloves</SelectItem>
                              <SelectItem value="pullover">Pullover</SelectItem>
                              <SelectItem value="toys">Toys</SelectItem>
                              <SelectItem value="pet">Pet</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="shrug">Shrug</SelectItem>
                              <SelectItem value="blanket">Blanket</SelectItem>
                              <SelectItem value="cardigan">Cardigan</SelectItem>
                              <SelectItem value="vest">Vest</SelectItem>
                              <SelectItem value="tank-camisole">Tank/Camisole</SelectItem>
                              <SelectItem value="tee">Tee</SelectItem>
                              <SelectItem value="jacket">Jacket</SelectItem>
                              <SelectItem value="dress-suit">Dress/Suit</SelectItem>
                              <SelectItem value="bag">Bag</SelectItem>
                              <SelectItem value="skirt">Skirt</SelectItem>
                              <SelectItem value="dishcloth">Dishcloth</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="craftType">Craft Type</Label>
                          <Select name="craftType">
                            <SelectTrigger>
                              <SelectValue placeholder="Select craft type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">Any Craft</SelectItem>
                              <SelectItem value="Knitting">Knitting</SelectItem>
                              <SelectItem value="Crochet">Crochet</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="requiredWeight">Yarn Weight</Label>
                          <Select name="requiredWeight">
                            <SelectTrigger>
                              <SelectValue placeholder="Select yarn weight" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">Any Weight</SelectItem>
                              <SelectItem value="lace">Lace</SelectItem>
                              <SelectItem value="cobweb">Cobweb</SelectItem>
                              <SelectItem value="thread">Thread</SelectItem>
                              <SelectItem value="light-fingering">Light Fingering</SelectItem>
                              <SelectItem value="fingering">Fingering (14 wpi)</SelectItem>
                              <SelectItem value="sport">Sport (12 wpi)</SelectItem>
                              <SelectItem value="dk">DK (11 wpi)</SelectItem>
                              <SelectItem value="worsted">Worsted (9 wpi)</SelectItem>
                              <SelectItem value="aran">Aran (8 wpi)</SelectItem>
                              <SelectItem value="bulky">Bulky (7 wpi)</SelectItem>
                              <SelectItem value="super-bulky">Super Bulky (5-6 wpi)</SelectItem>
                              <SelectItem value="jumbo">Jumbo (0-4 wpi)</SelectItem>
                              <SelectItem value="any-gauge">Any gauge - designed for any gauge</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label htmlFor="yardageMin">Min Yardage (optional)</Label>
                          <Input id="yardageMin" name="yardageMin" type="number" step="0.1" placeholder="e.g., 100" />
                        </div>
                        
                        <div>
                          <Label htmlFor="yardageMax">Max Yardage (optional)</Label>
                          <Input id="yardageMax" name="yardageMax" type="number" step="0.1" placeholder="e.g., 200" />
                        </div>
                        
                        <div>
                          <Label htmlFor="gramsMin">Min Grams (optional)</Label>
                          <Input id="gramsMin" name="gramsMin" type="number" step="0.1" placeholder="e.g., 50" />
                        </div>
                        
                        <div>
                          <Label htmlFor="gramsMax">Max Grams (optional)</Label>
                          <Input id="gramsMax" name="gramsMax" type="number" step="0.1" placeholder="e.g., 100" />
                        </div>
                      </div>
                    </div>
                    <Button type="submit" className="w-full">Add Pattern</Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {userPatterns.length > 0 ? (
          <div className="space-y-6">
            {/* Pattern Statistics */}
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{userPatterns.length}</div>
                  <div className="text-sm text-gray-600">Patterns</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {userPatterns.filter(p => p.google_drive_file_id).length}
                  </div>
                  <div className="text-sm text-gray-600">PDFs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {userPatterns.filter(p => p.craft_type === 'Knitting').length}
                  </div>
                  <div className="text-sm text-gray-600">Knitting</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {userPatterns.filter(p => p.craft_type === 'Crochet').length}
                  </div>
                  <div className="text-sm text-gray-600">Crochet</div>
                </div>
              </div>
            </div>

            {/* Filter and Sort Controls */}
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="craftFilter" className="text-sm font-medium">Craft:</Label>
                    <Select value={filterCraft} onValueChange={setFilterCraft}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="Knitting">Knitting</SelectItem>
                        <SelectItem value="Crochet">Crochet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label htmlFor="pdfFilter" className="text-sm font-medium">PDF:</Label>
                    <Select value={filterPdf} onValueChange={setFilterPdf}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="with-pdf">With PDF</SelectItem>
                        <SelectItem value="without-pdf">Without PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="sortBy" className="text-sm font-medium">Sort by:</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="designer">Designer</SelectItem>
                      <SelectItem value="craft">Craft Type</SelectItem>
                      <SelectItem value="type">Project Type</SelectItem>
                      <SelectItem value="pdf">PDF Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {filteredAndSortedPatterns.length !== userPatterns.length && (
                <div className="mt-3 text-sm text-gray-600">
                  Showing {filteredAndSortedPatterns.length} of {userPatterns.length} patterns
                </div>
              )}
            </div>

            {/* Pattern Grid - More compact layout */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {/* WIP Folder: Click to view all 'Work In Progress' patterns */}
              <Card className="flex flex-col items-center justify-center p-6 cursor-pointer hover:shadow-lg border-2 border-blue-400 bg-blue-50 relative overflow-hidden" onClick={() => setIsWipDialogOpen(true)}>
                {/* Background image */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: 'url(https://cdn.pixabay.com/photo/2022/07/06/21/16/lines-7306051_1280.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                />
                {/* Content */}
                <div className="relative z-10 flex flex-col items-center">
                  <Pin className="h-8 w-8 text-blue-600 mb-2" />
                  <div className="font-bold text-blue-700 text-lg">WIP Folder</div>
                  <div className="text-xs text-blue-600 mt-1">{wipPatternIds.size} in progress</div>
                </div>
              </Card>
              {/* Pattern Cards */}
              {filteredAndSortedPatterns.map((pattern) => (
                <PatternCard
                  key={pattern.pattern_id}
                  pattern={pattern}
                  yarnStash={yarnStash}
                  variant="patterns"
                  showDeleteButton={true}
                  onDelete={removePattern}
                  showUploadButton={true}
                  onUploadPdf={uploadPdfToPattern}
                  showDownloadButton={true}
                  showEditButton={true}
                  onEdit={handleEditPattern}
                  showFavoriteButton={true}
                  isFavorited={favoritedPatterns.has(pattern.pattern_id)}
                  onToggleFavorite={handleToggleFavorite}
                  isWip={wipPatternIds.has(pattern.pattern_id)}
                  onToggleWip={handleToggleWip}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Book className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No patterns yet</h3>
            <p className="text-gray-600 mb-4">Start building your pattern collection by adding your first pattern.</p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700 !bg-opacity-100">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Pattern
            </Button>
          </div>
        )}

        {/* Edit Pattern Dialog */}
        {patternToEdit && (
          <EditPatternDialog
            pattern={patternToEdit}
            isOpen={isEditDialogOpen}
            onClose={() => {
              setIsEditDialogOpen(false);
              setPatternToEdit(null);
            }}
            onUpdate={handlePatternUpdated}
            userId={currentUser?.user_id || 0}
          />
        )}

        {/* WIP Folder Dialog */}
        <Dialog open={isWipDialogOpen} onOpenChange={setIsWipDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Work In Progress</DialogTitle>
              <DialogDescription>Patterns you have marked as WIP</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {filteredAndSortedPatterns.filter(p => wipPatternIds.has(p.pattern_id)).length === 0 ? (
                <div className="col-span-full text-center text-gray-500">No patterns marked as WIP yet.</div>
              ) : (
                filteredAndSortedPatterns.filter(p => wipPatternIds.has(p.pattern_id)).map((pattern) => (
                  <PatternCard
                    key={pattern.pattern_id}
                    pattern={pattern}
                    yarnStash={yarnStash}
                    variant="patterns"
                    showDeleteButton={true}
                    onDelete={removePattern}
                    showUploadButton={true}
                    onUploadPdf={uploadPdfToPattern}
                    showDownloadButton={true}
                    showEditButton={true}
                    onEdit={handleEditPattern}
                    showFavoriteButton={true}
                    isFavorited={favoritedPatterns.has(pattern.pattern_id)}
                    onToggleFavorite={handleToggleFavorite}
                    isWip={true}
                    onToggleWip={handleToggleWip}
                  />
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Patterns;
