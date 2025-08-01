import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search as SearchIcon, Shuffle, History, Book, Package } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import PatternCard from '@/components/PatternCard';
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
  google_drive_file_id?: string; // Added for uploaded patterns
}

interface PaginationInfo {
  page: number;
  page_size: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface SearchResponse {
  patterns: Pattern[];
  pagination: PaginationInfo;
}

interface SearchQuery {
  id: string;
  projectType: string;
  craftType: string;
  weight: string;
  designer: string;
  timestamp: Date;
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

console.log('🔍 SEARCH PAGE API CONFIG CHECK:');
console.log('API_CONFIG.endpoints.patterns:', API_CONFIG.endpoints.patterns);
console.log('API_CONFIG.baseUrl:', API_CONFIG.baseUrl);

// Override fetch to catch HTTP requests
const originalFetch = window.fetch;
window.fetch = function(url: string | Request, ...args: any[]) {
  const urlString = typeof url === 'string' ? url : url.url;
  console.log('🔍 FETCH REQUEST DETECTED:', urlString);
  
  if (urlString.includes('railway.app') && urlString.startsWith('http://')) {
    console.error('🚨 HTTP REQUEST INTERCEPTED IN SEARCH PAGE:', urlString);
    console.trace('🚨 Stack trace:');
  }
  
  return originalFetch.call(this, url, ...args);
};

const Search = () => {
  const [searchResults, setSearchResults] = useState<Pattern[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchQuery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [yarnStash, setYarnStash] = useState<YarnStash[]>([]);
  const [showUploadedOnly, setShowUploadedOnly] = useState(false);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [lastFormData, setLastFormData] = useState<FormData | null>(null);
  const [isMatchingStash, setIsMatchingStash] = useState(false);
  const [isStashMatchingMode, setIsStashMatchingMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [favoritedPatterns, setFavoritedPatterns] = useState<Set<number>>(new Set());
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const pageInputRef = useRef<HTMLInputElement>(null);

  // Cache for stash matching results
  const [stashMatchCache, setStashMatchCache] = useState<Map<string, any>>(new Map());

  // Load data from localStorage and API
  useEffect(() => {
    const savedYarn = localStorage.getItem('yarnStash');
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedYarn) setYarnStash(JSON.parse(savedYarn));
    if (savedHistory) setSearchHistory(JSON.parse(savedHistory));
    
    // If no yarn in localStorage, fetch from API
    if (!savedYarn) {
      const loadYarnStash = async () => {
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) return;
        
        try {
          const user = JSON.parse(savedUser);
          const response = await fetch(`${API_CONFIG.endpoints.users}/${user.user_id}/yarn`);
          if (response.ok) {
            const data = await response.json();
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
            localStorage.setItem('yarnStash', JSON.stringify(transformedYarn));
            
            // Clear stash match cache when stash changes
            setStashMatchCache(new Map());
          }
        } catch (error) {
          console.error('Error fetching yarn stash:', error);
        }
      };
      
      loadYarnStash();
    }
  }, []);

  // Load favorited patterns
  useEffect(() => {
    const loadFavoritedPatterns = async () => {
      const savedUser = localStorage.getItem('currentUser');
      if (!savedUser) return;

      try {
        const user = JSON.parse(savedUser);
        const response = await fetch(`${API_CONFIG.endpoints.favorites}/${user.user_id}/favorites/?page=1&page_size=1000`);
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

  // Save search history to localStorage
  useEffect(() => {
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  // Handle scroll for back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate total yardage per weight class from stash
  const calculateStashYardageByWeight = useCallback(() => {
    const yardageByWeight: { [key: string]: number } = {};
    
    yarnStash.forEach(yarn => {
      if (yardageByWeight[yarn.weight]) {
        yardageByWeight[yarn.weight] += yarn.yardage;
      } else {
        yardageByWeight[yarn.weight] = yarn.yardage;
      }
    });
    
    return yardageByWeight;
  }, [yarnStash]);

  // Map stash weight values to pattern weight values
  const mapStashWeightToPatternWeight = useCallback((stashWeight: string): string[] => {
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
    
    return weightMapping[stashWeight] || [stashWeight];
  }, []);

  // Filter patterns based on stash yardage
  const filterPatternsByStash = useCallback((patterns: Pattern[]) => {
    const stashYardageByWeight = calculateStashYardageByWeight();
    

    console.log('Yarn stash:', yarnStash);
    console.log('Stash yardage by weight:', stashYardageByWeight);
    console.log('Available weight classes in stash:', Object.keys(stashYardageByWeight));
    
    const result = patterns.filter(pattern => {
      // Only include patterns that have required weight info
      if (!pattern.required_weight) {
        return false; // Exclude patterns without weight information
      }
      
      // Check if any stash weight matches the pattern weight
      let stashYardage = 0;
      let hasMatchingWeight = false;
      
      for (const stashWeight in stashYardageByWeight) {
        const patternWeights = mapStashWeightToPatternWeight(stashWeight);
        // Check for exact match first
        if (patternWeights.includes(pattern.required_weight)) {
          stashYardage += stashYardageByWeight[stashWeight];
          hasMatchingWeight = true;
        } else {
          // Try case-insensitive matching
          const patternWeightLower = pattern.required_weight.toLowerCase();
          const matchingWeight = patternWeights.find(w => w.toLowerCase() === patternWeightLower);
          if (matchingWeight) {
            stashYardage += stashYardageByWeight[stashWeight];
            hasMatchingWeight = true;
          }
        }
      }
      
      if (!hasMatchingWeight) {
        return false; // No matching weight class
      }
      
      // Handle different yardage scenarios
      const hasMinYardage = pattern.yardage_min !== null && pattern.yardage_min !== undefined;
      const hasMaxYardage = pattern.yardage_max !== null && pattern.yardage_max !== undefined;
      
      if (!hasMinYardage && !hasMaxYardage) {
        // No yardage info - can't determine if stash matches
        return false;
      }
      
      let matches = false;
      
      if (hasMinYardage && hasMaxYardage) {
        // Both min and max yardage - stash must be at least as much as max
        matches = stashYardage >= pattern.yardage_max;
      } else if (hasMinYardage) {
        // Only min yardage - stash must have at least this much
        matches = stashYardage >= pattern.yardage_min;
      } else if (hasMaxYardage) {
        // Only max yardage - stash must be at least as much as max
        matches = stashYardage >= pattern.yardage_max;
      }
      
      // Debug logging for first few patterns
      if (patterns.indexOf(pattern) < 5) {
        console.log(`Pattern "${pattern.name}":`, {
          required_weight: pattern.required_weight,
          yardage_min: pattern.yardage_min,
          yardage_max: pattern.yardage_max,
          stash_yardage: stashYardage,
          matches: matches
        });
      }
      
      return matches;
    });
    
    console.log(`Filtered ${patterns.length} patterns down to ${result.length} matching patterns`);

    
    return result;
  }, [yarnStash, calculateStashYardageByWeight, mapStashWeightToPatternWeight]);

  const performSearch = useCallback(async (formData: FormData | null = null, isRandom = false, shuffle = false, stashMatching?: boolean, page: number = 1, append: boolean = false, isInitialSearch: boolean = true) => {

    console.log('formData:', formData);
    console.log('isRandom:', isRandom);
    console.log('shuffle:', shuffle);
    console.log('stashMatching:', stashMatching);
    console.log('page:', page);
    console.log('append:', append);
    console.log('isInitialSearch:', isInitialSearch);
    
    setIsLoading(true);
    let query = "";
    // Get current user from localStorage
    const savedUser = localStorage.getItem('currentUser');
    let userId: number | null = null;
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        userId = user.user_id;
      } catch {}
    }
    
    // Use the passed stashMatching parameter or fall back to the state
    const shouldMatchStash = stashMatching !== undefined ? stashMatching : isMatchingStash;
    
    try {
      let response: SearchResponse;
      
      if (isRandom) {
        // For random search, we'll fetch multiple pages and shuffle across all results
        setIsRandomMode(true);
        setIsStashMatchingMode(shouldMatchStash);
        
        let allPatterns: Pattern[] = [];
        let totalPages = 1;
        
        // First, get the total count to determine how many pages to fetch
        const countParams = new URLSearchParams();
        countParams.append('page', '1');
        countParams.append('page_size', '1');
        if (formData) {
          if (formData.get('projectType') && formData.get('projectType') !== 'any') countParams.append('project_type', formData.get('projectType') as string);
          if (formData.get('craftType') && formData.get('craftType') !== 'any') countParams.append('craft_type', formData.get('craftType') as string);
          if (formData.get('weight') && formData.get('weight') !== 'any') countParams.append('weight', formData.get('weight') as string);
          if (formData.get('designer') && formData.get('designer') !== '') countParams.append('designer', formData.get('designer') as string);
          if (showUploadedOnly) {
            countParams.append('uploaded_only', 'true');
            if (userId !== null) countParams.append('user_id', String(userId));
          }
          if (showFreeOnly) countParams.append('free_only', 'true');
        }
        countParams.append('_t', Date.now().toString());
        
        const countUrl = `${API_CONFIG.endpoints.patterns}?${countParams.toString()}`;
        const countRes = await fetch(countUrl);
        
        if (countRes.ok) {
          const countData = await countRes.json();
          totalPages = Math.min(countData.pagination.pages, 10); // Limit to 10 pages max for performance
        }
        
        // Fetch patterns from multiple random pages across the entire range
        const pageSize = 100;
        const pagesToFetch = Math.min(totalPages, 5); // Fetch up to 5 pages for better randomization
        
        // Generate random page numbers to fetch from across the entire range
        const randomPages = [];
        for (let i = 0; i < pagesToFetch; i++) {
          const randomPage = Math.floor(Math.random() * totalPages) + 1;
          if (!randomPages.includes(randomPage)) {
            randomPages.push(randomPage);
          }
        }
        
        // If we don't have enough unique random pages, add more
        while (randomPages.length < pagesToFetch && randomPages.length < totalPages) {
          const randomPage = Math.floor(Math.random() * totalPages) + 1;
          if (!randomPages.includes(randomPage)) {
            randomPages.push(randomPage);
          }
        }
        
        for (let i = 0; i < randomPages.length; i++) {
          const params = new URLSearchParams();
          params.append('page', randomPages[i].toString());
          params.append('page_size', pageSize.toString());
          if (formData) {
            if (formData.get('projectType') && formData.get('projectType') !== 'any') params.append('project_type', formData.get('projectType') as string);
            if (formData.get('craftType') && formData.get('craftType') !== 'any') params.append('craft_type', formData.get('craftType') as string);
            if (formData.get('weight') && formData.get('weight') !== 'any') params.append('weight', formData.get('weight') as string);
            if (formData.get('designer') && formData.get('designer') !== '') params.append('designer', formData.get('designer') as string);
            if (showUploadedOnly) {
              params.append('uploaded_only', 'true');
              if (userId !== null) params.append('user_id', String(userId));
            }
            if (showFreeOnly) params.append('free_only', 'true');
          }
          params.append('_t', Date.now().toString());
          
          const searchUrl = `${API_CONFIG.endpoints.patterns}?${params.toString()}`;
          const res = await fetch(searchUrl);
          
          if (res.ok) {
            const pageData = await res.json();
            allPatterns = [...allPatterns, ...pageData.patterns];
          }
        }
        
        // Shuffle all collected patterns and take 3 random ones
        const shuffledPatterns = allPatterns.sort(() => Math.random() - 0.5).slice(0, 3);
        setSearchResults(shuffledPatterns);
        // Preserve pagination info instead of clearing it
        if (!paginationInfo) {
          // If no pagination info exists, create a minimal one to preserve page state
          setPaginationInfo({
            page: currentPage,
            page_size: 30,
            total: allPatterns.length,
            pages: Math.ceil(allPatterns.length / 30),
            has_next: false,
            has_prev: false
          });
        }
        setIsLoading(false);
        toast({ title: "Found random patterns!" });
        return;
      }
      
      // If stash matching is enabled, check if user is logged in
      if (shouldMatchStash) {
        if (!userId) {
          // User not logged in but trying to match stash - show error and return
          setIsLoading(false);
          toast({ 
            title: "Login required", 
            description: "Please log in to match patterns with your yarn stash." 
          });
          return;
        }
        
        // User is logged in, proceed with stash matching endpoint
        const stashParams = new URLSearchParams();
        stashParams.append('page', page.toString());
        stashParams.append('page_size', '30');
        
        // Add search constraints from form data
        if (formData) {
          if (formData.get('projectType') && formData.get('projectType') !== 'any') {
            stashParams.append('project_type', formData.get('projectType') as string);
          }
          if (formData.get('craftType') && formData.get('craftType') !== 'any') {
            stashParams.append('craft_type', formData.get('craftType') as string);
          }
          if (formData.get('weight') && formData.get('weight') !== 'any') {
            stashParams.append('weight', formData.get('weight') as string);
          }
          if (formData.get('designer') && formData.get('designer') !== '') {
            stashParams.append('designer', formData.get('designer') as string);
          }
          if (formData.get('name') && formData.get('name') !== '') {
            stashParams.append('name', formData.get('name') as string);
          }
        }
        
        if (showUploadedOnly) {
          stashParams.append('uploaded_only', 'true');
        }
        if (showFreeOnly) {
          stashParams.append('free_only', 'true');
        }
        
        // Add timestamp to force cache invalidation
        stashParams.append('_t', Date.now().toString());
        
        const stashUrl = `${API_CONFIG.endpoints.patterns}/stash-match/${userId}?${stashParams.toString()}`;
        
        // Check cache first
        const cacheKey = `${userId}-${stashParams.toString()}`;
        const cachedResult = stashMatchCache.get(cacheKey);
        
        if (cachedResult && !append) {
          // Use cached result for non-append requests
          response = cachedResult;
          setIsStashMatchingMode(true);
        } else {
          // Fetch from API
          const res = await fetch(stashUrl);
          
          if (res.ok) {
            response = await res.json();
            
            // Cache the result (only for non-append requests)
            if (!append) {
              setStashMatchCache(prev => new Map(prev).set(cacheKey, response));
            }
            
            // Set stash matching mode to true since we're using the stash matching endpoint
            setIsStashMatchingMode(true);
          } else {
            setIsLoading(false);
            toast({ title: "Error fetching stash matches from server." });
            return;
          }
        }
      } else {
        // Use the regular patterns endpoint
        setIsStashMatchingMode(false);
        
        if (formData) {
          setLastFormData(formData);
          const params = new URLSearchParams();
          params.append('page', page.toString());
          params.append('page_size', '30');
          if (formData.get('projectType') && formData.get('projectType') !== 'any') params.append('project_type', formData.get('projectType') as string);
          if (formData.get('craftType') && formData.get('craftType') !== 'any') params.append('craft_type', formData.get('craftType') as string);
          if (formData.get('weight') && formData.get('weight') !== 'any') params.append('weight', formData.get('weight') as string);
          if (formData.get('designer') && formData.get('designer') !== '') params.append('designer', formData.get('designer') as string);
          if (formData.get('name') && formData.get('name') !== '') params.append('name', formData.get('name') as string);
          if (showUploadedOnly) {
            params.append('uploaded_only', 'true');
            if (userId !== null) params.append('user_id', String(userId));
          }
          if (showFreeOnly) params.append('free_only', 'true');
          if (shuffle) params.append('shuffle', 'true');
          // Add timestamp to force cache invalidation
          params.append('_t', Date.now().toString());
          query = "?" + params.toString();
        } else {
          query = `?page=${page}&page_size=30&_t=${Date.now()}`;
        }
        
        const searchUrl = `${API_CONFIG.endpoints.patterns}${query}`;
        console.log('DEBUG: Regular search URL:', searchUrl);
        console.log('DEBUG: About to fetch search URL');
        const res = await fetch(searchUrl);
        
        if (res.ok) {
          response = await res.json();
        }
      }
      
      // Handle pagination
      setPaginationInfo(response.pagination);
      setCurrentPage(page);
      
      // Get patterns from response
      let patterns = response.patterns;

      // Deduplicate: if both uploaded and imported exist, only show uploaded
      // Also, copy pattern_url from imported to uploaded if missing
      const dedupedPatterns: Pattern[] = [];
      const seen = new Set<string>();
      const uploadedMap = new Map<string, Pattern>();
      const importedMap = new Map<string, Pattern>();
      // First, collect uploaded and imported patterns by key
      for (const p of patterns) {
        const key = `${p.name.toLowerCase()}|${(p.designer || '').toLowerCase()}`;
        if (p.google_drive_file_id) {
          uploadedMap.set(key, p);
        } else {
          importedMap.set(key, p);
        }
      }
      // Now, build deduped list
      for (const [key, uploaded] of uploadedMap.entries()) {
        // If imported exists and uploaded is missing pattern_url, copy it
        const imported = importedMap.get(key);
        if (imported && !uploaded.pattern_url && imported.pattern_url) {
          uploaded.pattern_url = imported.pattern_url;
        }
        if (!seen.has(key)) {
          dedupedPatterns.push(uploaded);
          seen.add(key);
        }
      }
      // Add imported patterns that don't have an uploaded version
      for (const [key, imported] of importedMap.entries()) {
        if (!uploadedMap.has(key) && !seen.has(key)) {
          dedupedPatterns.push(imported);
          seen.add(key);
        }
      }
      // Append or replace results
      if (append) {
        setSearchResults(prev => [...prev, ...dedupedPatterns]);
      } else {
        setSearchResults(dedupedPatterns);
      }
      setIsLoading(false);
      
      const resultCount = response.pagination.total;
      // Only show toast notifications for initial searches (not page changes or shuffling)
      if (isInitialSearch && !shuffle) {
        if (isRandom) {
          toast({ title: "Found random patterns!" });
        } else if (shouldMatchStash) {
          toast({ title: `Found ${resultCount} pattern${resultCount !== 1 ? 's' : ''} that match your stash!` });
        } else {
          toast({ title: `Found ${resultCount} matching pattern${resultCount !== 1 ? 's' : ''}` });
        }
      }
      // Save search to history if not random
      if (!isRandom && formData) {
        const projectType = formData.get('projectType') as string;
        const craftType = formData.get('craftType') as string;
        const weight = formData.get('weight') as string;
        const designer = formData.get('designer') as string;
        const newSearch: SearchQuery = {
          id: Date.now().toString(),
          projectType: projectType || 'any',
          craftType: craftType || 'any',
          weight: weight || 'any',
          designer: designer || '',
          timestamp: new Date(),
        };
        setSearchHistory([newSearch, ...searchHistory.slice(0, 9)]); // Keep last 10 searches
      }
      setIsRandomMode(false);
    } catch (error) {
      setIsLoading(false);
      toast({ title: "Error fetching patterns from server." });
    }
  }, [isMatchingStash, showUploadedOnly, showFreeOnly, searchHistory, yarnStash.length]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // Don't reset stash matching state - preserve it for the search
    performSearch(formData, false, false, isMatchingStash, 1, false, true);
  };

  const handleRandomSearch = () => {
    setIsRandomMode(false); // reset before search
    
    // Get current form data to apply constraints
    const form = document.getElementById('searchForm') as HTMLFormElement;
    let formData: FormData | null = null;
    
    if (form) {
      formData = new FormData(form);
      
      // Check if any filters are set (not "any" or empty)
      const projectType = formData.get('projectType') as string;
      const craftType = formData.get('craftType') as string;
      const weight = formData.get('weight') as string;
      const designer = formData.get('designer') as string;
      
      // Only use formData if there are actual constraints
      const hasConstraints = (
        (projectType && projectType !== 'any') ||
        (craftType && craftType !== 'any') ||
        (weight && weight !== 'any') ||
        (designer && designer !== '') ||
        showUploadedOnly ||
        showFreeOnly ||
        isMatchingStash
      );
      
      if (!hasConstraints) {
        formData = null; // Use null to get truly random patterns
      }
    }
    
    performSearch(formData, true, false, isMatchingStash, 1, false, true);
  };

  const handleShuffleResults = () => {
    // This function shuffles the current page results without changing the page
    if (searchResults.length === 0) {
      toast({ title: "No results to shuffle", description: "Please perform a search first." });
      return;
    }
    
    // Simply shuffle the current search results
    const shuffledResults = [...searchResults].sort(() => Math.random() - 0.5);
    setSearchResults(shuffledResults);
    toast({ title: "Results shuffled!" });
  };

  const handleMatchStash = useCallback(() => {
    // Get current user from localStorage to check tools
    const savedUser = localStorage.getItem('currentUser');
    let userId: number | null = null;
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        userId = user.user_id;
      } catch {}
    }
    
    // Check if user is logged in
    if (!userId) {
      toast({ 
        title: "Login required", 
        description: "Please log in to match patterns with your yarn stash." 
      });
      return;
    }
    
    if (yarnStash.length === 0) {
      toast({ 
        title: "No stash data", 
        description: "Add some yarn to your stash to use this feature." 
      });
      return;
    }
    
    // Just toggle the state without triggering a search
    setIsMatchingStash(!isMatchingStash);
  }, [yarnStash.length, isMatchingStash]);

  const repeatSearch = (query: SearchQuery) => {
    const form = document.getElementById('searchForm') as HTMLFormElement;
    if (form) {
      // Set form values
      const projectTypeSelect = form.querySelector('[name="projectType"]') as HTMLSelectElement;
      const craftTypeSelect = form.querySelector('[name="craftType"]') as HTMLSelectElement;
      const weightSelect = form.querySelector('[name="weight"]') as HTMLSelectElement;
      const designerInput = form.querySelector('[name="designer"]') as HTMLInputElement;
      if (projectTypeSelect) projectTypeSelect.value = query.projectType;
      if (craftTypeSelect) craftTypeSelect.value = query.craftType;
      if (weightSelect) weightSelect.value = query.weight;
      if (designerInput) designerInput.value = query.designer;
      // Create FormData and search, preserving stash matching state
      const formData = new FormData(form);
      performSearch(formData, false, false, isMatchingStash, 1, false, true);
    }
  };

  const loadNextPage = () => {
    if (paginationInfo && paginationInfo.has_next) {
      performSearch(lastFormData, false, false, isMatchingStash, currentPage + 1, false, false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const loadPrevPage = () => {
    if (paginationInfo && paginationInfo.has_prev) {
      performSearch(lastFormData, false, false, isMatchingStash, currentPage - 1, false, false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const loadPage = (pageNum: number) => {
    performSearch(lastFormData, false, false, isMatchingStash, pageNum, false, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      
      const response = await fetch(`${API_CONFIG.endpoints.favorites}/${user.user_id}/favorites/${patternId}/`, {
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

  // Add a helper to capitalize the first letter of a string
  function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E2F0FA] via-[#F9F9F6] to-[#FDFCFB]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Pattern Search</h1>
          <p className="text-gray-600">Find patterns that match your yarn stash and project goals</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Search Form */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Search Filters</h2>
              <form id="searchForm" onSubmit={handleSearch} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant={isMatchingStash ? "default" : "outline"}
                    className={`w-full font-semibold shadow-md ${
                      isMatchingStash 
                        ? "bg-green-600 hover:bg-green-700 text-white !bg-opacity-100" 
                        : "border-green-600 text-green-600 hover:bg-green-50"
                    }`}
                    onClick={handleMatchStash}
                    disabled={isLoading}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Match Stash
                  </Button>
                </div>
                <div>
                  <Label htmlFor="projectType">Project Type</Label>
                  <Select name="projectType">
                    <SelectTrigger>
                      <SelectValue placeholder="Any project" />
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
                      <SelectValue placeholder="Any craft" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Craft</SelectItem>
                      <SelectItem value="knitting">Knitting</SelectItem>
                      <SelectItem value="crochet">Crochet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="weight">Yarn Weight</Label>
                  <Select name="weight">
                    <SelectTrigger>
                      <SelectValue placeholder="Any weight" />
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
                <div>
                  <Label htmlFor="name">Pattern name</Label>
                  <Input 
                    name="name"
                    placeholder="Search by pattern name..."
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="designer">Designer</Label>
                  <Input 
                    name="designer"
                    placeholder="Search by designer name..."
                    className="w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="uploadedOnly"
                    checked={showUploadedOnly}
                    onChange={() => setShowUploadedOnly(!showUploadedOnly)}
                  />
                  <Label htmlFor="uploadedOnly">Show only my uploaded patterns</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="freeOnly"
                    checked={showFreeOnly}
                    onChange={() => setShowFreeOnly(!showFreeOnly)}
                  />
                  <Label htmlFor="freeOnly">Free patterns only</Label>
                </div>
                <Button type="submit" className="w-full bg-slate-700 hover:bg-slate-800 text-white" disabled={isLoading}>
                  <SearchIcon className="h-4 w-4 mr-2" />
                  {isLoading ? 'Searching...' : 'Search Patterns'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleRandomSearch}
                  disabled={isLoading}
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Random Pattern
                </Button>
              </form>
              {/* Search History */}
              {searchHistory.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <History className="h-4 w-4 mr-1" />
                    Recent Searches
                  </h3>
                  <div className="space-y-2">
                    {searchHistory.slice(0, 5).map((query) => (
                      <div 
                        key={query.id}
                        className="text-xs p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                        onClick={() => repeatSearch(query)}
                      >
                        <div className="font-medium">
                          {query.projectType !== 'any' && `${query.projectType} • `}
                          {query.craftType !== 'any' && `${query.craftType} • `}
                          {query.weight !== 'any' && `${query.weight} • `}
                          {query.designer && `${query.designer}`}
                        </div>
                        <div className="text-gray-500">
                          {new Date(query.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
            {yarnStash.length === 0 && (
              <Card className="p-4 mt-4 bg-amber-50 border-amber-200">
                <p className="text-sm text-amber-800">
                  💡 Add yarn to your stash to get more personalized pattern recommendations!
                </p>
              </Card>
            )}
            {(() => {
              // Check if user is logged in
              const savedUser = localStorage.getItem('currentUser');
              const isLoggedIn = savedUser !== null;
              
              return isLoggedIn && yarnStash.length > 0 && (
                <Card className="p-4 mt-4 bg-green-50 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium text-green-800">Your Stash Summary</p>
                  </div>
                  <div className="text-xs text-green-700 space-y-1">
                    {Object.entries(calculateStashYardageByWeight()).map(([weight, yardage]) => (
                      <p key={weight}>
                        <span className="font-medium">{capitalize(weight)}:</span> {yardage} yards
                      </p>
                    ))}
                  </div>
                </Card>
              );
            })()}
          </div>
          {/* Search Results */}
          <div className="lg:col-span-3">
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="bg-gray-200 h-48 rounded mb-4"></div>
                    <div className="bg-gray-200 h-4 rounded mb-2"></div>
                    <div className="bg-gray-200 h-3 rounded w-2/3"></div>
                  </Card>
                ))}
              </div>
            )}
            {!isLoading && searchResults.length > 0 && (
              <>
                {/* Search Results Header with Top Pagination */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4">
                    {isMatchingStash && (
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <Package className="h-4 w-4" />
                        <span>Showing patterns that match your yarn stash</span>
                      </div>
                    )}

                    {paginationInfo && paginationInfo.pages > 1 && !isRandomMode && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadPrevPage}
                          disabled={!paginationInfo.has_prev}
                          className="px-2"
                        >
                          ←
                        </Button>
                        
                        <span className="text-xs text-gray-600 px-2">
                          {currentPage}/{paginationInfo.pages}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadNextPage}
                          disabled={!paginationInfo.has_next}
                          className="px-2"
                        >
                          →
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleShuffleResults}
                  >
                    <Shuffle className="h-4 w-4 mr-2" />
                    Shuffle Results
                  </Button>
                </div>
              </>
            )}
            {!isLoading && searchResults.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.map((pattern) => {
                    // Check if user is logged in
                    const savedUser = localStorage.getItem('currentUser');
                    const isLoggedIn = savedUser !== null;
                    
                    return (
                      <PatternCard 
                        key={pattern.pattern_id} 
                        pattern={pattern} 
                        yarnStash={isLoggedIn ? yarnStash : []} 
                        isStashMatchingMode={isStashMatchingMode}
                        showFavoriteButton={true}
                        isFavorited={favoritedPatterns.has(pattern.pattern_id)}
                        onToggleFavorite={handleToggleFavorite}
                        showDownloadButton={true}
                      />
                    );
                  })}
                </div>
                
                {/* Bottom Pagination Controls - Full Featured */}
                {paginationInfo && paginationInfo.pages > 1 && !isRandomMode && (
                  <div className="mt-8 flex justify-center">
                    <div className="flex flex-col items-center gap-4">
                      {/* Page Navigation */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadPage(1)}
                          disabled={currentPage === 1}
                        >
                          First
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadPrevPage}
                          disabled={!paginationInfo.has_prev}
                        >
                          ← Previous
                        </Button>
                        {/* Page numbers */}
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(7, paginationInfo.pages) }, (_, i) => {
                            let pageNum;
                            if (paginationInfo.pages <= 7) {
                              pageNum = i + 1;
                            } else if (currentPage <= 4) {
                              pageNum = i + 1;
                            } else if (currentPage >= paginationInfo.pages - 3) {
                              pageNum = paginationInfo.pages - 6 + i;
                            } else {
                              pageNum = currentPage - 3 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => loadPage(pageNum)}
                                className="w-10 h-10"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        {/* Page input for direct navigation */}
                        <form onSubmit={e => { e.preventDefault(); if (pageInput && !isNaN(Number(pageInput))) { loadPage(Number(pageInput)); setPageInput(''); } }} className="flex items-center gap-2">
                          <input
                            ref={pageInputRef}
                            type="number"
                            min={1}
                            max={paginationInfo.pages}
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
                          onClick={loadNextPage}
                          disabled={!paginationInfo.has_next}
                        >
                          Next →
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadPage(paginationInfo.pages)}
                          disabled={currentPage === paginationInfo.pages}
                        >
                          Last
                        </Button>
                      </div>
                      {/* Results info */}
                      <div className="text-sm text-gray-600">
                        Page {currentPage} of {paginationInfo.pages} • {paginationInfo.total} total patterns
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            {!isLoading && searchResults.length === 0 && (
              <Card className="p-8 text-center">
                <SearchIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No patterns found</h3>
                <p className="text-gray-600 mb-4">
                  {isMatchingStash 
                    ? "No patterns match your current yarn stash. Try adding more yarn or adjusting your search criteria."
                    : "Try adjusting your search criteria or adding more yarn to your stash"
                  }
                </p>
                <Button onClick={handleRandomSearch} className="bg-slate-700 hover:bg-slate-800 text-white">
                  <Shuffle className="h-4 w-4 mr-2" />
                  Try Random Pattern
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-50 !bg-opacity-100"
          aria-label="Back to top"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Search;