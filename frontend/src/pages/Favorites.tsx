import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heart, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import PatternCard from '@/components/PatternCard';
import { useNavigate } from 'react-router-dom';
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

interface PaginationInfo {
  page: number;
  page_size: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface FavoritesResponse {
  patterns: Pattern[];
  pagination: PaginationInfo;
}

const Favorites = () => {
  const [favorites, setFavorites] = useState<Pattern[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo | null>(null);
  const [yarnStash, setYarnStash] = useState<any[]>([]);
  const navigate = useNavigate();

  // Load yarn stash from localStorage
  useEffect(() => {
    const savedYarn = localStorage.getItem('yarnStash');
    if (savedYarn) {
      const parsedYarn = JSON.parse(savedYarn);
      setYarnStash(parsedYarn);
    }
  }, []);

  // Get current user from localStorage
  const getCurrentUser = () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {}
    }
    return null;
  };

  const loadFavorites = useCallback(async (page: number = 1) => {
    const user = getCurrentUser();
    if (!user) {
      toast({ 
        title: "Not logged in", 
        description: "Please log in to view your favorites." 
      });
      navigate('/login');
      return;
    }

    setIsLoading(true);
    try {
              const response = await fetch(`${API_CONFIG.endpoints.favorites}/${user.user_id}/favorites/?page=${page}&page_size=30`);
      if (!response.ok) {
        throw new Error('Failed to load favorites');
      }
      
      const data: FavoritesResponse = await response.json();
      setFavorites(data.patterns);
      setPaginationInfo(data.pagination);
      setCurrentPage(page);
      
      // Debug: Check if patterns have required fields for stash matching
      if (data.patterns.length > 0) {
        console.log('First favorite pattern:', data.patterns[0]);
        console.log('Has required_weight:', !!data.patterns[0].required_weight);
        console.log('Has yardage_min:', !!data.patterns[0].yardage_min);
        console.log('Has yardage_max:', !!data.patterns[0].yardage_max);
      }
    } catch (error) {
      toast({ title: "Error loading favorites" });
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadFavorites(1);
  }, [loadFavorites]);

  const handleToggleFavorite = async (patternId: number) => {
    const user = getCurrentUser();
    if (!user) return;

    try {
      // Remove from favorites
      const response = await fetch(`${API_CONFIG.endpoints.favorites}/${user.user_id}/favorites/${patternId}/`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setFavorites(prev => prev.filter(pattern => pattern.pattern_id !== patternId));
        toast({ title: "Removed from favorites" });
        
        // Reload current page if it's empty
        if (favorites.length === 1 && currentPage > 1) {
          loadFavorites(currentPage - 1);
        }
      } else {
        throw new Error('Failed to remove from favorites');
      }
    } catch (error) {
      toast({ title: "Error removing from favorites" });
    }
  };

  const loadNextPage = () => {
    if (paginationInfo && paginationInfo.has_next) {
      loadFavorites(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const loadPrevPage = () => {
    if (paginationInfo && paginationInfo.has_prev) {
      loadFavorites(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const loadPage = (pageNum: number) => {
    loadFavorites(pageNum);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E2F0FA] via-[#F9F9F6] to-[#FDFCFB]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-red-500 fill-current" />
              <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
            </div>
          </div>
          <p className="text-gray-600">Your saved patterns for easy access</p>
        </div>

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

        {!isLoading && favorites.length > 0 && (
          <>
            {/* Results Header with Pagination */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <Heart className="h-4 w-4 fill-current" />
                  <span>{paginationInfo?.total || 0} favorited patterns</span>
                </div>
                {paginationInfo && paginationInfo.pages > 1 && (
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
            </div>

            {/* Favorites Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((pattern) => (
                <PatternCard 
                  key={pattern.pattern_id} 
                  pattern={pattern} 
                  yarnStash={yarnStash}
                  showFavoriteButton={true}
                  isFavorited={true}
                  onToggleFavorite={handleToggleFavorite}
                  variant="search"
                  isStashMatchingMode={false}
                  cardSize="small"
                />
              ))}
            </div>
            
            {/* Bottom Pagination Controls */}
            {paginationInfo && paginationInfo.pages > 1 && (
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
                    Page {currentPage} of {paginationInfo.pages} • {paginationInfo.total} total favorites
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!isLoading && favorites.length === 0 && (
          <Card className="p-8 text-center">
            <Heart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites yet</h3>
            <p className="text-gray-600 mb-4">
              Start exploring patterns and add them to your favorites to see them here!
            </p>
            <Button onClick={() => navigate('/search')}>
              Browse Patterns
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Favorites; 