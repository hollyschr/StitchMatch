import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Plus, Package, Wrench, Edit, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import API_CONFIG from '@/config/api';

interface User {
  user_id: number;
  name: string;
  email: string;
  profile_photo?: string;
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

interface Tool {
  id: string;
  type: string;
  size: string;
}

const Stash = () => {
  console.log('Stash component function called');
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [yarnStash, setYarnStash] = useState<YarnStash[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [isYarnDialogOpen, setIsYarnDialogOpen] = useState(false);
  const [isToolDialogOpen, setIsToolDialogOpen] = useState(false);
  const [isEditYarnDialogOpen, setIsEditYarnDialogOpen] = useState(false);
  const [editingYarn, setEditingYarn] = useState<YarnStash | null>(null);
  const [expandedTools, setExpandedTools] = useState<{ [key: string]: boolean }>({});
  const [selectedYarn, setSelectedYarn] = useState<YarnStash | null>(null);
  const [matchedPatterns, setMatchedPatterns] = useState<any[]>([]);
  const [isPatternsDialogOpen, setIsPatternsDialogOpen] = useState(false);
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(false);
  const [showUploadedOnly, setShowUploadedOnly] = useState(false);
  const [newToolType, setNewToolType] = useState<string>('');
  const [newToolSize, setNewToolSize] = useState<string>('');

  useEffect(() => {
    console.log('Stash component mounted');
    const user = localStorage.getItem('currentUser');
    console.log('User from localStorage:', user);
    
    if (!user) {
      console.log('No user found, redirecting to home');
      navigate('/');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(user);
      console.log('Parsed user:', parsedUser);
      setCurrentUser(parsedUser);
      fetchYarnStash(parsedUser.user_id);
      fetchTools(parsedUser.user_id);
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/');
    }
  }, [navigate]);

  const fetchYarnStash = async (userId: number) => {
    try {
      const response = await fetch(`${API_CONFIG.endpoints.users}/${userId}/yarn/`);
      if (response.ok) {
        const data = await response.json();
        // Transform the data to match the frontend interface
        const transformedYarn = data.yarn ? data.yarn.map((yarn: any) => ({
          id: yarn.yarn_id,
          yarnName: yarn.yarn_name,
          brand: yarn.brand,
          weight: yarn.weight,
          fiber: yarn.fiber,
          yardage: yarn.yardage,
          grams: yarn.grams
        })) : [];
        console.log('Transformed yarn data:', transformedYarn);
        setYarnStash(transformedYarn);
        // Save to localStorage for other components to use
        localStorage.setItem('yarnStash', JSON.stringify(transformedYarn));
      }
    } catch (error) {
      console.error('Error fetching yarn stash:', error);
    }
  };

  const fetchTools = async (userId: number) => {
    try {
      const response = await fetch(`${API_CONFIG.endpoints.users}/${userId}/tools/`);
      if (response.ok) {
        const data = await response.json();
        // Transform the data to match the frontend interface
        const transformedTools = data.map((tool: any) => ({
          id: tool.id, // Backend returns "id" field, not "tool_id"
          type: tool.type,
          size: tool.size
        }));
        console.log('Transformed tools data:', transformedTools);
        setTools(transformedTools);
      }
    } catch (error) {
      console.error('Error fetching tools:', error);
    }
  };

  const addYarn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const newYarn: Omit<YarnStash, 'id'> = {
      yarnName: formData.get('yarnName') as string,
      brand: formData.get('brand') as string,
      weight: formData.get('weight') as string,
      fiber: formData.get('fiber') as string,
      yardage: parseInt(formData.get('yardage') as string),
      grams: parseInt(formData.get('grams') as string),
    };

    fetch(`${API_CONFIG.endpoints.users}/${currentUser!.user_id}/yarn/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newYarn),
    })
      .then((response) => response.json())
      .then((data) => {
        // Transform the response to match the frontend interface
        const transformedYarn = {
          id: data.yarn_id,
          yarnName: newYarn.yarnName,
          brand: newYarn.brand,
          weight: newYarn.weight,
          fiber: newYarn.fiber,
          yardage: newYarn.yardage,
          grams: newYarn.grams
        };
        const updatedYarnStash = [...yarnStash, transformedYarn];
        setYarnStash(updatedYarnStash);
        localStorage.setItem('yarnStash', JSON.stringify(updatedYarnStash));
        setIsYarnDialogOpen(false);
        event.currentTarget.reset();
        toast({ title: 'Yarn added successfully!' });
      })
      .catch((error) => {
        console.error('Error adding yarn:', error);
        toast({ title: 'Error adding yarn', variant: 'destructive' });
      });
  };

  const editYarn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingYarn) return;

    const formData = new FormData(event.currentTarget);
    
    const updatedYarn: YarnStash = {
      id: editingYarn.id,
      yarnName: formData.get('yarnName') as string,
      brand: formData.get('brand') as string,
      weight: formData.get('weight') as string,
      fiber: formData.get('fiber') as string,
      yardage: parseInt(formData.get('yardage') as string),
      grams: parseInt(formData.get('grams') as string),
    };

    try {
      const response = await fetch(`${API_CONFIG.endpoints.users}/${currentUser!.user_id}/yarn/${editingYarn.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedYarn),
      });

      if (response.ok) {
        const updatedYarnStash = yarnStash.map(yarn => yarn.id === editingYarn.id ? updatedYarn : yarn);
        setYarnStash(updatedYarnStash);
        localStorage.setItem('yarnStash', JSON.stringify(updatedYarnStash));
        setIsEditYarnDialogOpen(false);
        setEditingYarn(null);
        toast({ title: 'Yarn updated successfully!' });
      }
    } catch (error) {
      console.error('Error updating yarn:', error);
      toast({ title: 'Error updating yarn', variant: 'destructive' });
    }
  };

  const openEditDialog = (yarn: YarnStash) => {
    setEditingYarn(yarn);
    setIsEditYarnDialogOpen(true);
  };

  const addTool = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!newToolType || !newToolSize) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    
    const newTool: Omit<Tool, 'id'> = {
      type: newToolType,
      size: newToolSize,
    };

    console.log('Sending tool data:', newTool);
    fetch(`${API_CONFIG.endpoints.users}/${currentUser!.user_id}/tools/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTool),
    })
      .then((response) => {
        console.log('Tool creation response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log('Tool creation response data:', data);
        // Transform the response to match the frontend interface
        const transformedTool = {
          id: data.tool_id,
          type: newTool.type,
          size: newTool.size
        };
        console.log('Transformed tool:', transformedTool);
        setTools([...tools, transformedTool]);
        setIsToolDialogOpen(false);
        setNewToolType('');
        setNewToolSize('');
        toast({ 
          title: 'Tool added successfully!',
          duration: 2000 // Show for 2 seconds instead of default
        });
      })
      .catch((error) => {
        console.error('Error adding tool:', error);
        if (error.message) {
          console.error('Error message:', error.message);
        }
        
        // Check if it's a "already own this tool" error
        if (error.message && error.message.includes('already own this tool')) {
          toast({ title: 'You already own this tool', variant: 'destructive' });
        } else {
          toast({ title: 'Error adding tool', variant: 'destructive' });
        }
      });
  };

  const removeYarn = (id: string) => {
    fetch(`${API_CONFIG.endpoints.users}/${currentUser!.user_id}/yarn/${id}`, {
      method: 'DELETE',
    })
      .then(() => {
        const updatedYarnStash = yarnStash.filter(yarn => yarn.id !== id);
        setYarnStash(updatedYarnStash);
        localStorage.setItem('yarnStash', JSON.stringify(updatedYarnStash));
        toast({ title: 'Yarn removed successfully!' });
      })
      .catch((error) => {
        console.error('Error removing yarn:', error);
        toast({ title: 'Error removing yarn', variant: 'destructive' });
      });
  };

  const removeTool = (id: string) => {
    console.log('Removing tool with ID:', id);
    console.log('Current tools:', tools);
    
    if (!id || id === 'undefined') {
      console.error('Invalid tool ID:', id);
      toast({ title: 'Error: Invalid tool ID', variant: 'destructive' });
      return;
    }
    
    fetch(`${API_CONFIG.endpoints.users}/${currentUser!.user_id}/tools/${id}`, {
      method: 'DELETE',
    })
      .then((response) => {
        console.log('Delete response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log('Delete response data:', data);
        setTools(tools.filter(tool => tool.id !== id));
        toast({ title: 'Tool removed successfully!' });
      })
      .catch((error) => {
        console.error('Error removing tool:', error);
        toast({ title: 'Error removing tool', variant: 'destructive' });
      });
  };

  const toggleToolExpansion = (toolType: string) => {
    setExpandedTools(prev => ({
      ...prev,
      [toolType]: !prev[toolType]
    }));
  };

  const getToolsByType = (type: string) => {
    return tools.filter(tool => tool.type === type);
  };

  const fetchMatchedPatterns = async (yarn: YarnStash) => {
    setIsLoadingPatterns(true);
    setSelectedYarn(yarn);
    setIsPatternsDialogOpen(true);
    
    try {
      // Map stash weight to pattern weight values
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
        'jumbo': ['Jumbo (0-4 wpi)', 'Jumbo']
      };
      
      const patternWeights = weightMapping[yarn.weight] || [yarn.weight];
      
      // Try to find patterns for each compatible weight (both imported and user-uploaded)
      let allPatterns: any[] = [];
      
      for (const weight of patternWeights) {
        // Get imported patterns
        const importedResponse = await fetch(`${API_CONFIG.endpoints.patterns}?weight=${encodeURIComponent(weight)}&page=1&page_size=10`);
        if (importedResponse.ok) {
          const importedData = await importedResponse.json();
          allPatterns = [...allPatterns, ...(importedData.patterns || [])];
        }
        
        // Get user-uploaded patterns for current user
        if (currentUser) {
          const userResponse = await fetch(`${API_CONFIG.endpoints.users}/${currentUser.user_id}/patterns/`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            // Filter user patterns by weight
            const matchingUserPatterns = userData.filter((pattern: any) => {
              if (!pattern.required_weight) return false;
              return patternWeights.some(w => 
                pattern.required_weight.toLowerCase().includes(w.toLowerCase())
              );
            });
            allPatterns = [...allPatterns, ...matchingUserPatterns];
          }
        }
      }
      
      // Remove duplicates and limit to 20 patterns
      const uniquePatterns = allPatterns.filter((pattern, index, self) => 
        index === self.findIndex(p => p.pattern_id === pattern.pattern_id)
      ).slice(0, 20);
      
      setMatchedPatterns(uniquePatterns);
    } catch (error) {
      console.error('Error fetching matched patterns:', error);
      setMatchedPatterns([]);
    } finally {
      setIsLoadingPatterns(false);
    }
  };

  const knittingNeedles = getToolsByType('knitting-needle');
  const crochetHooks = getToolsByType('crochet-hook');

  // Filter patterns based on checkbox state
  const filteredPatterns = showUploadedOnly 
    ? matchedPatterns.filter(pattern => !pattern.pattern_url) // User-uploaded patterns don't have pattern_url
    : matchedPatterns;

  console.log('Stash component rendering, currentUser:', currentUser);
  console.log('Yarn stash:', yarnStash);
  console.log('Tools:', tools);
  
  if (!currentUser) {
    console.log('No currentUser, showing loading');
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Stash</h1>

        {/* Stash Statistics */}
        <div className="bg-white rounded-lg p-3 shadow-sm border mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{yarnStash.length}</div>
              <div className="text-sm text-gray-600">Yarn</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {yarnStash.reduce((total, yarn) => total + yarn.yardage, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Yards</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {yarnStash.reduce((total, yarn) => total + yarn.grams, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Grams</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{tools.length}</div>
              <div className="text-sm text-gray-600">Tools</div>
            </div>
          </div>
        </div>

        {/* Yarn Section */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
              <Package className="h-6 w-6 mr-2 text-green-600" />
              Yarn ({yarnStash.length})
            </h2>
            <Dialog open={isYarnDialogOpen} onOpenChange={setIsYarnDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Yarn
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Yarn</DialogTitle>
                </DialogHeader>
                <form onSubmit={addYarn} className="space-y-4">
                  <div>
                    <Label htmlFor="yarnName">Yarn Name</Label>
                    <Input id="yarnName" name="yarnName" required />
                  </div>
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input id="brand" name="brand" required />
                  </div>
                  <div>
                    <Label htmlFor="weight">Weight</Label>
                    <Select name="weight" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select weight" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lace">Lace</SelectItem>
                        <SelectItem value="cobweb">Cobweb</SelectItem>
                        <SelectItem value="thread">Thread</SelectItem>
                        <SelectItem value="light-fingering">Light Fingering</SelectItem>
                        <SelectItem value="fingering">Fingering (14 wpi)</SelectItem>
                        <SelectItem value="sport">Sport (12 wpi)</SelectItem>
                        <SelectItem value="dk">DK (11 wpi)</SelectItem>
                        <SelectItem value="dk-sport">DK / Sport</SelectItem>
                        <SelectItem value="worsted">Worsted (9 wpi)</SelectItem>
                        <SelectItem value="aran">Aran (8 wpi)</SelectItem>
                        <SelectItem value="aran-worsted">Aran / Worsted</SelectItem>
                        <SelectItem value="bulky">Bulky (7 wpi)</SelectItem>
                        <SelectItem value="super-bulky">Super Bulky (5-6 wpi)</SelectItem>
                        <SelectItem value="jumbo">Jumbo (0-4 wpi)</SelectItem>
                        <SelectItem value="any-gauge">Any gauge - designed for any gauge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="fiber">Fiber Content</Label>
                    <Input id="fiber" name="fiber" placeholder="e.g., 100% wool" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="yardage">Yardage</Label>
                      <Input id="yardage" name="yardage" type="number" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="grams">Grams</Label>
                      <Input id="grams" name="grams" type="number" required />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Add Yarn</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {yarnStash.map((yarn) => (
              <Card 
                key={yarn.id} 
                className="p-3 hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col"
                onClick={() => fetchMatchedPatterns(yarn)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-sm leading-tight">{yarn.yarnName}</h3>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(yarn);
                      }}
                      className="text-blue-500 hover:text-blue-700 h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeYarn(yarn.id);
                      }}
                      className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-gray-600 flex-1">
                  <p><span className="font-medium">Brand:</span> {yarn.brand}</p>
                  <p><span className="font-medium">Weight:</span> {yarn.weight}</p>
                  <p><span className="font-medium">Fiber:</span> {yarn.fiber}</p>
                  <p><span className="font-medium">Yardage:</span> {yarn.yardage} yds</p>
                  <p><span className="font-medium">Grams:</span> {yarn.grams} g</p>
                </div>
                <div className="mt-2 text-xs text-green-600 font-medium">
                  Click to see matched patterns
                </div>
              </Card>
            ))}
          </div>

          {yarnStash.length === 0 && (
            <Card className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No yarn in your stash yet</h3>
              <p className="text-gray-600 mb-4">Add some yarn to get started with pattern matching</p>
            </Card>
          )}
        </div>

        {/* Edit Yarn Dialog */}
        <Dialog open={isEditYarnDialogOpen} onOpenChange={setIsEditYarnDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Yarn</DialogTitle>
            </DialogHeader>
            {editingYarn && (
              <form onSubmit={editYarn} className="space-y-4">
                <div>
                  <Label htmlFor="edit-yarnName">Yarn Name</Label>
                  <Input 
                    id="edit-yarnName" 
                    name="yarnName" 
                    defaultValue={editingYarn.yarnName}
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-brand">Brand</Label>
                  <Input 
                    id="edit-brand" 
                    name="brand" 
                    defaultValue={editingYarn.brand}
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-weight">Weight</Label>
                  <Select name="weight" defaultValue={editingYarn.weight} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select weight" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lace">Lace</SelectItem>
                      <SelectItem value="cobweb">Cobweb</SelectItem>
                      <SelectItem value="thread">Thread</SelectItem>
                      <SelectItem value="light-fingering">Light Fingering</SelectItem>
                      <SelectItem value="fingering">Fingering (14 wpi)</SelectItem>
                      <SelectItem value="sport">Sport (12 wpi)</SelectItem>
                      <SelectItem value="dk">DK (11 wpi)</SelectItem>
                      <SelectItem value="dk-sport">DK / Sport</SelectItem>
                      <SelectItem value="worsted">Worsted (9 wpi)</SelectItem>
                      <SelectItem value="aran">Aran (8 wpi)</SelectItem>
                      <SelectItem value="aran-worsted">Aran / Worsted</SelectItem>
                      <SelectItem value="bulky">Bulky (7 wpi)</SelectItem>
                      <SelectItem value="super-bulky">Super Bulky (5-6 wpi)</SelectItem>
                      <SelectItem value="jumbo">Jumbo (0-4 wpi)</SelectItem>
                      <SelectItem value="any-gauge">Any gauge - designed for any gauge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-fiber">Fiber Content</Label>
                  <Input 
                    id="edit-fiber" 
                    name="fiber" 
                    placeholder="e.g., 100% wool" 
                    defaultValue={editingYarn.fiber}
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-yardage">Yardage</Label>
                    <Input 
                      id="edit-yardage" 
                      name="yardage" 
                      type="number" 
                      defaultValue={editingYarn.yardage}
                      required 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-grams">Grams</Label>
                    <Input 
                      id="edit-grams" 
                      name="grams" 
                      type="number" 
                      defaultValue={editingYarn.grams}
                      required 
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setIsEditYarnDialogOpen(false);
                      setEditingYarn(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">Update Yarn</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Tools Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
              <Wrench className="h-6 w-6 mr-2 text-amber-600" />
              Tools ({tools.length})
            </h2>
            <Dialog open={isToolDialogOpen} onOpenChange={setIsToolDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tool
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Tool</DialogTitle>
                </DialogHeader>
                <form onSubmit={addTool} className="space-y-4">
                  <div>
                    <Label htmlFor="type">Tool Type</Label>
                    <Select value={newToolType} onValueChange={setNewToolType} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tool type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="knitting-needle">Knitting Needle</SelectItem>
                        <SelectItem value="crochet-hook">Crochet Hook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="size">Size</Label>
                    <Input 
                      id="size" 
                      value={newToolSize}
                      onChange={(e) => setNewToolSize(e.target.value)}
                      placeholder="e.g., US 8, 5.0mm" 
                      required 
                    />
                  </div>
                  <Button type="submit" className="w-full">Add Tool</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Knitting Needles Card */}
            <Card 
              className="p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => toggleToolExpansion('knitting-needle')}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Wrench className="h-8 w-8 mr-3 text-blue-600" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Knitting Needles</h3>
                    <p className="text-sm text-gray-600">{knittingNeedles.length} sizes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expandedTools['knitting-needle'] ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </div>
              
              {expandedTools['knitting-needle'] && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {knittingNeedles.length > 0 ? (
                    <div className="space-y-2">
                      {knittingNeedles.map((tool) => (
                        <div key={tool.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{tool.size}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTool(tool.id);
                            }}
                            className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-2">No knitting needles added yet</p>
                  )}
                </div>
              )}
            </Card>

            {/* Crochet Hooks Card */}
            <Card 
              className="p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => toggleToolExpansion('crochet-hook')}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Wrench className="h-8 w-8 mr-3 text-purple-600" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Crochet Hooks</h3>
                    <p className="text-sm text-gray-600">{crochetHooks.length} sizes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expandedTools['crochet-hook'] ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </div>
              
              {expandedTools['crochet-hook'] && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {crochetHooks.length > 0 ? (
                    <div className="space-y-2">
                      {crochetHooks.map((tool) => (
                        <div key={tool.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{tool.size}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTool(tool.id);
                            }}
                            className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-2">No crochet hooks added yet</p>
                  )}
                </div>
              )}
            </Card>
          </div>

          {tools.length === 0 && (
            <Card className="p-8 text-center">
              <Wrench className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tools added yet</h3>
              <p className="text-gray-600 mb-4">Add your knitting needles, crochet hooks, and other tools</p>
            </Card>
          )}
        </div>
      </div>

      {/* Matched Patterns Dialog */}
      <Dialog open={isPatternsDialogOpen} onOpenChange={setIsPatternsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Patterns for {selectedYarn?.yarnName} ({selectedYarn?.weight})
            </DialogTitle>
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox 
                id="uploaded-only" 
                checked={showUploadedOnly}
                onCheckedChange={(checked) => setShowUploadedOnly(checked as boolean)}
              />
              <Label htmlFor="uploaded-only" className="text-sm">
                Show only uploaded patterns
              </Label>
            </div>
          </DialogHeader>
          
          {isLoadingPatterns ? (
            <div className="text-center py-8">
              <div className="text-lg">Loading matched patterns...</div>
            </div>
          ) : filteredPatterns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPatterns.map((pattern) => (
                <Card 
                  key={pattern.pattern_id} 
                  className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    if (pattern.pattern_url) {
                      // Imported pattern - open Ravelry link
                      window.open(`${API_CONFIG.baseUrl}/view-pattern/${pattern.pattern_id}`, '_blank');
                    } else if (pattern.pdf_file) {
                      // User-uploaded pattern with PDF - open PDF
                      window.open(`${API_CONFIG.baseUrl}/view-pdf/${pattern.pattern_id}`, '_blank');
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <img 
                      src={pattern.image || "/placeholder.svg"}
                      alt={pattern.name}
                      className="w-16 h-16 object-cover rounded bg-gray-200"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{pattern.name}</h3>
                      <p className="text-xs text-gray-600">by {pattern.designer}</p>
                      <div className="mt-2 space-y-1 text-xs text-gray-500">
                        {pattern.project_type && (
                          <p><span className="font-medium">Type:</span> {pattern.project_type}</p>
                        )}
                        {pattern.craft_type && (
                          <p><span className="font-medium">Craft:</span> {pattern.craft_type}</p>
                        )}
                        {pattern.price && (
                          <p><span className="font-medium">Price:</span> {pattern.price}</p>
                        )}
                      </div>
                      {pattern.pattern_url && (
                        <div className="mt-2 text-xs text-blue-600 font-medium">
                          Click to view on Ravelry →
                        </div>
                      )}
                      {!pattern.pattern_url && pattern.pdf_file && (
                        <div className="mt-2 text-xs text-green-600 font-medium">
                          Click to view PDF →
                        </div>
                      )}
                      {!pattern.pattern_url && !pattern.pdf_file && (
                        <div className="mt-2 text-xs text-gray-500 font-medium">
                          No link available
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-lg text-gray-600">
                {showUploadedOnly 
                  ? "No uploaded patterns found for this yarn weight"
                  : "No patterns found for this yarn weight"
                }
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {showUploadedOnly 
                  ? "Try uploading patterns or uncheck the filter to see all patterns"
                  : "Try searching for patterns manually or check different yarn weights"
                }
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Stash;
