import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
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

function matchesStash(pattern, yarnStash) {
  if (!pattern.required_weight || yarnStash.length === 0) {
    return false;
  }
  const weightMapping = {
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
  const heldYarnCalculations = {
    'thread': [ { weight: 'Lace', description: '2 strands of thread = Lace weight' } ],
    'lace': [
      { weight: 'Fingering (14 wpi)', description: '2 strands of lace = Fingering to Sport weight' },
      { weight: 'Sport (12 wpi)', description: '2 strands of lace = Fingering to Sport weight' }
    ],
    'fingering': [ { weight: 'DK (11 wpi)', description: '2 strands of fingering = DK weight' } ],
    'sport': [
      { weight: 'DK (11 wpi)', description: '2 strands of sport = DK or Light Worsted' },
      { weight: 'Worsted (9 wpi)', description: '2 strands of sport = DK or Light Worsted' }
    ],
    'dk': [
      { weight: 'Worsted (9 wpi)', description: '2 strands of DK = Worsted or Aran' },
      { weight: 'Aran (8 wpi)', description: '2 strands of DK = Worsted or Aran' }
    ],
    'worsted': [ { weight: 'Bulky (7 wpi)', description: '2 strands of Worsted = Chunky' } ],
    'aran': [
      { weight: 'Bulky (7 wpi)', description: '2 strands of Aran = Chunky to Super Bulky' },
      { weight: 'Super Bulky (5-6 wpi)', description: '2 strands of Aran = Chunky to Super Bulky' }
    ],
    'bulky': [
      { weight: 'Super Bulky (5-6 wpi)', description: '2 strands of Chunky = Super Bulky to Jumbo' },
      { weight: 'Jumbo (0-4 wpi)', description: '2 strands of Chunky = Super Bulky to Jumbo' }
    ]
  };
  const normalizeWeight = (weight) => weight.toLowerCase().replace(/\s*\(\d+\s*wpi\)/, '');
  const checkWeightMatch = (stashWeight, patternWeight) => {
    const stashNormalized = normalizeWeight(stashWeight);
    const patternNormalized = normalizeWeight(patternWeight);
    // Direct match
    if (stashNormalized === patternNormalized) return { matches: true, description: `${stashWeight} (direct match)` };
    // Check weight mapping
    const possiblePatternWeights = (weightMapping[stashWeight] || []).map(w => normalizeWeight(w));
    if (possiblePatternWeights.includes(patternNormalized)) return { matches: true, description: `${stashWeight} (direct match)` };
    // Check reverse mapping
    const possibleStashWeights = (weightMapping[patternWeight] || []).map(w => normalizeWeight(w));
    if (possibleStashWeights.includes(stashNormalized)) return { matches: true, description: `${stashWeight} (direct match)` };
    // Check held yarn calculations
    const heldCalculations = heldYarnCalculations[stashNormalized];
    if (heldCalculations) {
      for (const calc of heldCalculations) {
        if (normalizeWeight(calc.weight) === patternNormalized) return { matches: true, description: calc.description };
      }
    }
    // Check partial matching for cases like "fingering" vs "Fingering (14 wpi)"
    if (patternNormalized.includes(stashNormalized) || stashNormalized.includes(patternNormalized)) {
      return { matches: true, description: `${stashWeight} (direct match)` };
    }
    return { matches: false };
  };
  let totalYardage = 0;
  for (const yarn of yarnStash) {
    const weightCheck = checkWeightMatch(yarn.weight, pattern.required_weight);
    if (weightCheck.matches) {
      // For double-held, divide yardage by 2
      const isDoubleHeld = weightCheck.description && weightCheck.description.toLowerCase().includes('2 strands');
      totalYardage += isDoubleHeld ? yarn.yardage / 2 : yarn.yardage;
    }
  }
  if (totalYardage === 0) return false;
  const hasMinYardage = pattern.yardage_min !== null && pattern.yardage_min !== undefined;
  const hasMaxYardage = pattern.yardage_max !== null && pattern.yardage_max !== undefined;
  let yardageMatches = false;
  if (hasMinYardage) {
    yardageMatches = totalYardage >= pattern.yardage_min;
  } else if (hasMaxYardage) {
    yardageMatches = totalYardage >= pattern.yardage_max;
  } else {
    return false;
  }
  console.log("matchesStash result:", {pattern, yarnStash, totalYardage, yardageMatches});
  return yardageMatches;
}

// Add a helper to calculate total yardage by weight
function getStashSummary(yarnStash) {
  const summary = {};
  for (const yarn of yarnStash) {
    if (!yarn.weight) continue;
    if (!summary[yarn.weight]) summary[yarn.weight] = 0;
    summary[yarn.weight] += yarn.yardage || 0;
  }
  return summary;
}

// Add a helper to capitalize the first letter of a string
function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatterns, setTotalPatterns] = useState(0);
  const [pageInput, setPageInput] = useState('');
  const pageInputRef = useRef<HTMLInputElement>(null);
  const [newToolType, setNewToolType] = useState<string>('');
  const [newToolSize, setNewToolSize] = useState<string>('');
  const [yarnToDelete, setYarnToDelete] = useState<YarnStash | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  // Ref for the patterns dialog content to scroll to top on page change
  const patternsDialogRef = useRef<HTMLDivElement>(null);
  const [allStashMatches, setAllStashMatches] = useState<any[]>([]);

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

  // On mount, fetch all stash-matched patterns for the user (not just for a selected yarn)
  useEffect(() => {
    if (currentUser) {
      fetch(`${API_CONFIG.endpoints.patterns}/stash-match/${currentUser.user_id}?page=1&page_size=100000`)
        .then(res => res.ok ? res.json() : { patterns: [] })
        .then(data => setAllStashMatches(data.patterns || []));
    }
  }, [currentUser]);

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
          grams: yarn.grams,
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
    const yardageValue = formData.get('yardage');
    const gramsValue = formData.get('grams');
    if ((!yardageValue || yardageValue === '') && (!gramsValue || gramsValue === '')) {
      toast({ title: 'Please enter at least yardage or grams', variant: 'destructive' });
      return;
    }

    // Parse the values
    const yardage = yardageValue && (yardageValue as string) !== '' ? parseFloat(yardageValue as string) : null;
    const grams = gramsValue && (gramsValue as string) !== '' ? parseFloat(gramsValue as string) : null;
  
    // Check if provided values are greater than 0
    if ((yardage !== null && (isNaN(yardage) || yardage <= 0)) || 
        (grams !== null && (isNaN(grams) || grams <= 0))) {
      toast({ title: 'Yardage and grams must be greater than 0', variant: 'destructive' });
      return;
    }
    
    // Use snake_case keys as expected by the backend
    const newYarn = {
      yarn_name: formData.get('yarnName'),
      brand: formData.get('brand'),
      weight: formData.get('weight'),
      fiber: formData.get('fiber') ? formData.get('fiber') : '',
      yardage: yardageValue && (yardageValue as string) !== '' ? parseFloat(yardageValue as string) : null,
      grams: gramsValue && (gramsValue as string) !== '' ? parseFloat(gramsValue as string) : null,
    };

    fetch(`${API_CONFIG.endpoints.users}/${currentUser!.user_id}/yarn/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newYarn),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 400 && errorData.detail && errorData.detail.includes('already owns this yarn')) {
            toast({ title: 'You already own this yarn', variant: 'destructive' });
          } else if (response.status === 422) {
            toast({ title: 'Invalid yarn data. Please check your input.', variant: 'destructive' });
          } else {
            toast({ title: 'Error adding yarn', variant: 'destructive' });
          }
          throw new Error(errorData.detail || 'Error adding yarn');
        }
        return response.json();
      })
      .then((data) => {
        // Transform the response to match the frontend interface
        const transformedYarn = {
          id: data.yarn_id,
          yarnName: String(newYarn.yarn_name),
          brand: String(newYarn.brand),
          weight: String(newYarn.weight),
          fiber: String(newYarn.fiber),
          yardage: newYarn.yardage,
          grams: newYarn.grams
        };
        const updatedYarnStash = [...yarnStash, transformedYarn];
        setYarnStash(updatedYarnStash);
        localStorage.setItem('yarnStash', JSON.stringify(updatedYarnStash));
        setIsYarnDialogOpen(false);
        if (event.currentTarget && typeof (event.currentTarget as HTMLFormElement).reset === 'function') {
          (event.currentTarget as HTMLFormElement).reset();
        }
        toast({ title: 'Yarn added successfully!' });
      })
      .catch((error) => {
        console.error('Error adding yarn:', error);
        // Toasts are handled above for known errors
      });
  };

  const editYarn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingYarn) return;

    const formData = new FormData(event.currentTarget);
    const yardageValue = formData.get('yardage');
    const gramsValue = formData.get('grams');
    if ((!yardageValue || yardageValue === '') && (!gramsValue || gramsValue === '')) {
      toast({ title: 'Please enter at least yardage or grams', variant: 'destructive' });
      return;
    }

    // Parse the values
    const yardage = yardageValue && (yardageValue as string) !== '' ? parseFloat(yardageValue as string) : null;
    const grams = gramsValue && (gramsValue as string) !== '' ? parseFloat(gramsValue as string) : null;
  
    // Check if provided values are greater than 0
    if ((yardage !== null && (isNaN(yardage) || yardage <= 0)) || 
        (grams !== null && (isNaN(grams) || grams <= 0))) {
      toast({ title: 'Yardage and grams must be greater than 0', variant: 'destructive' });
      return;
    }

    const updatedYarn = {
      yarn_name: formData.get('yarnName') as string,
      brand: formData.get('brand') as string,
      weight: formData.get('weight') as string,
      fiber: formData.get('fiber') ? (formData.get('fiber') as string) : '',
      yardage: yardageValue && (yardageValue as string) !== '' ? parseFloat(yardageValue as string) : null,
      grams: gramsValue && (gramsValue as string) !== '' ? parseFloat(gramsValue as string) : null,
    };

    try {
      // 1. Delete the old yarn from the user's stash
      const deleteRes = await fetch(`${API_CONFIG.endpoints.users}/${currentUser!.user_id}/yarn/${editingYarn.id}`, {
        method: 'DELETE',
      });
      if (!deleteRes.ok) {
        toast({ title: 'Error removing old yarn', variant: 'destructive' });
        return;
      }
      // 2. Add the new yarn with updated values
      const addRes = await fetch(`${API_CONFIG.endpoints.users}/${currentUser!.user_id}/yarn/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedYarn),
      });
      if (!addRes.ok) {
        toast({ title: 'Error adding updated yarn', variant: 'destructive' });
        return;
      }
      const data = await addRes.json();
      // 3. Refresh the yarn stash
      fetchYarnStash(currentUser!.user_id);
      setIsEditYarnDialogOpen(false);
      setEditingYarn(null);
      toast({ title: 'Yarn updated successfully!' });
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
    setCurrentPage(1);
    try {
      // Debug: Log all patterns for this yarn
      console.log("allStashMatches", allStashMatches.map(p => ({name: p.name, required_weight: p.required_weight, yardage_min: p.yardage_min, yardage_max: p.yardage_max, google_drive_file_id: p.google_drive_file_id})));
      const yarnMatches = allStashMatches.filter((pattern) => {
        console.log("Pattern:", pattern, "Yarn:", yarn);
        return matchesStash(pattern, [yarn]);
      });
      setMatchedPatterns(yarnMatches);
    } catch (error) {
      console.error('Error filtering matched patterns:', error);
      setMatchedPatterns([]);
    } finally {
      setIsLoadingPatterns(false);
    }
  };

  // Helper: mapping for held yarn calculations (same as PatternCard)
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
  function getMatchDescription(yarnWeight: string, patternWeight: string) {
    const weightMapping = {
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

    const heldYarnCalculations = {
      'thread': [{ weight: 'Lace', description: '2 strands of thread = Lace weight' }],
      'lace': [
        { weight: 'Fingering (14 wpi)', description: '2 strands of lace = Fingering to Sport weight' },
        { weight: 'Sport (12 wpi)', description: '2 strands of lace = Fingering to Sport weight' }
      ],
      'fingering': [{ weight: 'DK (11 wpi)', description: '2 strands of fingering = DK weight' }],
      'sport': [
        { weight: 'DK (11 wpi)', description: '2 strands of sport = DK or Light Worsted' },
        { weight: 'Worsted (9 wpi)', description: '2 strands of sport = DK or Light Worsted' }
      ],
      'dk': [
        { weight: 'Worsted (9 wpi)', description: '2 strands of DK = Worsted or Aran' },
        { weight: 'Aran (8 wpi)', description: '2 strands of DK = Worsted or Aran' }
      ],
      'worsted': [{ weight: 'Bulky (7 wpi)', description: '2 strands of Worsted = Chunky' }],
      'aran': [
        { weight: 'Bulky (7 wpi)', description: '2 strands of Aran = Chunky to Super Bulky' },
        { weight: 'Super Bulky (5-6 wpi)', description: '2 strands of Aran = Chunky to Super Bulky' }
      ],
      'bulky': [
        { weight: 'Super Bulky (5-6 wpi)', description: '2 strands of Chunky = Super Bulky to Jumbo' },
        { weight: 'Jumbo (0-4 wpi)', description: '2 strands of Chunky = Super Bulky to Jumbo' }
      ]
    };

    const normalizeWeight = (weight) => weight.toLowerCase().replace(/\s*\(\d+\s*wpi\)/, '');
    
    const stashNormalized = normalizeWeight(yarnWeight);
    const patternNormalized = normalizeWeight(patternWeight);
    
    // Direct match
    if (stashNormalized === patternNormalized) {
      return `${capitalize(yarnWeight)} (direct match)`;
    }
    
    // Check weight mapping
    const possiblePatternWeights = (weightMapping[yarnWeight] || []).map(w => normalizeWeight(w));
    if (possiblePatternWeights.includes(patternNormalized)) {
      return `${capitalize(yarnWeight)} (direct match)`;
    }
    
    // Check reverse mapping
    const possibleStashWeights = (weightMapping[patternWeight] || []).map(w => normalizeWeight(w));
    if (possibleStashWeights.includes(stashNormalized)) {
      return `${capitalize(yarnWeight)} (direct match)`;
    }
    
    // Check held yarn calculations
    const heldCalculations = heldYarnCalculations[stashNormalized];
    if (heldCalculations) {
      for (const calc of heldCalculations) {
        if (normalizeWeight(calc.weight) === patternNormalized) {
          return calc.description;
        }
      }
    }
    
    // Check partial matching for cases like "fingering" vs "Fingering (14 wpi)"
    if (patternNormalized.includes(stashNormalized) || stashNormalized.includes(patternNormalized)) {
      return `${capitalize(yarnWeight)} (direct match)`;
    }
    
    return null;
  }
  function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  const filteredPatterns = showUploadedOnly
    ? matchedPatterns.filter((pattern) => pattern.google_drive_file_id)
    : matchedPatterns;

  // Pagination: always show 20 patterns per page
  const patternsPerPage = 20;
  const paginatedPatterns = filteredPatterns.slice((currentPage - 1) * patternsPerPage, currentPage * patternsPerPage);
  const totalFilteredPatterns = filteredPatterns.length;
  const totalFilteredPages = Math.ceil(totalFilteredPatterns / patternsPerPage);



  // Scroll to top of patterns dialog when page changes
  useEffect(() => {
    if (patternsDialogRef.current) {
      patternsDialogRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  console.log('Stash component rendering, currentUser:', currentUser);
  console.log('Yarn stash:', yarnStash);
  console.log('Tools:', tools);
  
  if (!currentUser) {
    console.log('No currentUser, showing loading');
    return <div>Loading...</div>;
  }

  const stashSummary = getStashSummary(yarnStash);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E2F0FA] via-[#F9F9F6] to-[#FDFCFB]">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Stash</h1>

        {/* Stash Statistics */}
        <div className="bg-white rounded-lg p-3 shadow-sm border mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{yarnStash.length}</div>
              <div className="text-sm text-gray-600">Yarn</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {yarnStash.reduce((total, yarn) => total + yarn.yardage, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Yards</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {yarnStash.reduce((total, yarn) => total + yarn.grams, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Grams</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{tools.length}</div>
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
                <Button className="bg-green-600 hover:bg-green-700 !bg-opacity-100">
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
                    <Input id="fiber" name="fiber" placeholder="e.g., 100% wool" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="yardage">Yardage</Label>
                      <Input id="yardage" name="yardage" type="number" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="grams">Grams</Label>
                      <Input id="grams" name="grams" type="number" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Add Yarn</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Your Stash Summary</h3>
            {Object.keys(stashSummary).length === 0 ? (
              <p className="text-gray-500">No yarn in your stash yet.</p>
            ) : (
              <ul className="text-sm text-gray-700">
                {(Object.entries(stashSummary) as [string, number][]).map(([weight, yards]) => (
                  <li key={weight}><span className="font-medium">{capitalize(weight)}:</span> {yards} yards</li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {yarnStash.map((yarn) => {
              // Use the same logic as Search page for matching patterns to this yarn
              const allMatches = allStashMatches.filter((pattern) => matchesStash(pattern, [yarn]));
              // Uploaded = has google_drive_file_id, Imported = does not
              const uploadedMatches = allMatches.filter((pattern) => pattern.google_drive_file_id);
              const importedMatches = allMatches.filter((pattern) => !pattern.google_drive_file_id);
              return (
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
                          setYarnToDelete(yarn);
                          setIsDeleteConfirmOpen(true);
                        }}
                        className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600 flex-1">
                    <p><span className="font-medium">Brand:</span> {yarn.brand}</p>
                    <p><span className="font-medium">Weight:</span> {capitalize(yarn.weight)}</p>
                    <p><span className="font-medium">Fiber:</span> {yarn.fiber}</p>
                    <p><span className="font-medium">Yardage:</span> {yarn.yardage} yds</p>
                    <p><span className="font-medium">Grams:</span> {yarn.grams} g</p>
                  </div>
                  <div className="mt-2 text-xs text-green-700 font-medium">
                    Matches: {allMatches.length}
                  </div>
                  <div className="mt-2 text-xs text-green-600 font-medium">
                    Click to see matched patterns
                  </div>
                </Card>
              );
            })}
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
              <Wrench className="h-6 w-6 mr-2 text-blue-600" />
              Tools ({tools.length})
            </h2>
            <Dialog open={isToolDialogOpen} onOpenChange={setIsToolDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-600 hover:bg-amber-700 !bg-opacity-100">
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
                  <Wrench className="h-8 w-8 mr-3 text-green-600" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Knitting Needles</h3>
                    <p className="text-sm text-gray-600">{getToolsByType('knitting-needle').length} sizes</p>
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
                  {getToolsByType('knitting-needle').length > 0 ? (
                    <div className="space-y-2">
                      {getToolsByType('knitting-needle').map((tool) => (
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
                    <p className="text-sm text-gray-600">{getToolsByType('crochet-hook').length} sizes</p>
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
                  {getToolsByType('crochet-hook').length > 0 ? (
                    <div className="space-y-2">
                      {getToolsByType('crochet-hook').map((tool) => (
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" ref={patternsDialogRef}>
          <DialogHeader>
            <DialogTitle>
              Patterns for {selectedYarn?.yarnName} ({selectedYarn?.weight})
            </DialogTitle>
            <DialogDescription>
              This dialog shows all patterns that match the selected yarn from your stash.
            </DialogDescription>
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
            <>
              <div className="mb-4 text-sm text-gray-600">
                Showing {totalFilteredPatterns} pattern{totalFilteredPatterns !== 1 ? 's' : ''} for this yarn
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedPatterns.map((pattern) => {
                  const matchDesc = selectedYarn ? getMatchDescription(selectedYarn.weight, pattern.required_weight) : null;
                  return (
                    <Card 
                      key={pattern.pattern_id} 
                      className="p-4 hover:shadow-lg transition-shadow cursor-pointer h-auto min-h-0 flex flex-col justify-start"
                      style={{ minHeight: '180px', maxHeight: '320px' }}
                      onClick={() => {
                        if (pattern.pattern_url) {
                          window.open(pattern.pattern_url, '_blank');
                        } else if (pattern.google_drive_file_id) {
                          // Fetch the redirect URL and open it in a new tab
                          fetch(`${API_CONFIG.baseUrl}/view-pdf/${pattern.pattern_id}`)
                            .then(res => res.json())
                            .then(data => {
                              if (data.redirect_url) {
                                window.open(data.redirect_url, '_blank');
                              }
                            })
                            .catch(err => {
                              console.error('Error fetching PDF:', err);
                            });
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <img 
                          src={pattern.image || (pattern.craft_type === 'crochet' ? "https://sdmntpreastus.oaiusercontent.com/files/00000000-19a4-61f9-85bd-8765a0374680/raw?se=2025-07-11T03%3A49%3A03Z&sp=r&sv=2024-08-04&sr=b&scid=79d87cc5-1bc8-5049-9b97-43d8603b6a85&skoid=b0fd38cc-3d33-418f-920e-4798de4acdd1&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-07-11T02%3A17%3A58Z&ske=2025-07-12T02%3A17%3A58Z&sks=b&skv=2024-08-04&sig=KIxN9KB4ySdkMct%2BVNgUOiJ2oPnpvDPtdoc8SJGBEdQ%3D" : "https://st3.depositphotos.com/30372524/35212/v/450/depositphotos_352125152-stock-illustration-knitting-logo-design-crochet-icon.jpg")}
                          alt={pattern.name}
                          className="w-16 h-16 object-cover rounded bg-gray-200"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{pattern.name}</h3>
                          <p className="text-xs text-gray-600">by {pattern.designer}</p>
                          <p className="text-xs text-green-700 font-medium mt-1">
                            Stash Match: {matchDesc}
                          </p>
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
                          {!pattern.pattern_url && pattern.google_drive_file_id && (
                            <div className="mt-2 text-xs text-green-600 font-medium">
                              Click to view PDF →
                            </div>
                          )}
                          {!pattern.pattern_url && !pattern.google_drive_file_id && (
                            <div className="mt-2 text-xs text-gray-500 font-medium">
                              No link available
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              
              {/* Pagination Controls - Full Featured */}
              {totalFilteredPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <div className="flex flex-col items-center gap-4">
                    {/* Page Navigation */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        ← Previous
                      </Button>
                      {/* Page numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(7, totalFilteredPages) }, (_, i) => {
                          let pageNum;
                          if (totalFilteredPages <= 7) {
                            pageNum = i + 1;
                          } else if (currentPage <= 4) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalFilteredPages - 3) {
                            pageNum = totalFilteredPages - 6 + i;
                          } else {
                            pageNum = currentPage - 3 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-10 h-10"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      {/* Page input for direct navigation */}
                      <form onSubmit={e => { e.preventDefault(); if (pageInput && !isNaN(Number(pageInput))) { setCurrentPage(Number(pageInput)); setPageInput(''); } }} className="flex items-center gap-2">
                        <input
                          ref={pageInputRef}
                          type="number"
                          min={1}
                          max={totalFilteredPages}
                          value={pageInput}
                          onChange={e => setPageInput(e.target.value)}
                          className="w-16 px-2 py-1 border rounded text-sm"
                          placeholder="Page #"
                        />
                        <Button type="submit" size="sm" variant="outline">Go</Button>
                      </form>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalFilteredPages}
                      >
                        Next →
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalFilteredPages)}
                        disabled={currentPage === totalFilteredPages}
                      >
                        Last
                      </Button>
                    </div>
                    {/* Results info */}
                    <div className="text-sm text-gray-600">
                      Page {currentPage} of {totalFilteredPages} • {totalFilteredPatterns} total patterns
                    </div>
                  </div>
                </div>
              )}
            </>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Yarn</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{yarnToDelete?.yarnName}"?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (yarnToDelete) removeYarn(yarnToDelete.id);
                setIsDeleteConfirmOpen(false);
                setYarnToDelete(null);
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Stash;

