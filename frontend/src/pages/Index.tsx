import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Scissors, Package, Search, Shuffle, LogIn, UserPlus, Heart, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface User {
  user_id: number;
  name: string;
  email: string;
  profile_photo?: string;
}

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E2F0FA] via-[#F9F9F6] to-[#FDFCFB]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Scissors className="h-8 w-8 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900">StitchMatch</h1>
            </div>
            <nav className="flex space-x-4">
              {currentUser ? (
                <>
                  <Button 
                    variant={location.pathname === '/stash' ? 'outline' : 'ghost'} 
                    onClick={() => navigate('/stash')}
                  >
                    My Stash
                  </Button>
                  <Button 
                    variant={location.pathname === '/patterns' ? 'outline' : 'ghost'} 
                    onClick={() => navigate('/patterns')}
                  >
                    Patterns
                  </Button>
                  <Button 
                    variant={location.pathname === '/search' ? 'outline' : 'ghost'} 
                    onClick={() => navigate('/search')}
                  >
                    Search
                  </Button>
                  <Button 
                    variant={location.pathname === '/favorites' ? 'outline' : 'ghost'} 
                    onClick={() => navigate('/favorites')}
                  >
                    <Heart className="h-4 w-4 mr-1" />
                    Favorites
                  </Button>
                  <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-1" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant={location.pathname === '/search' ? 'outline' : 'ghost'} 
                    onClick={() => navigate('/search')}
                  >
                    Search
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/login')}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                  <Button onClick={() => navigate('/login')}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Sign Up
                  </Button>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Find Perfect Patterns for Your Stash
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Reduce waste and spark creativity by discovering knitting and crochet patterns 
            that match the yarn and tools you already own.
          </p>
          {!currentUser && (
            <div className="mt-8 flex justify-center space-x-4">
              <Button onClick={() => navigate('/login')} size="lg" className="bg-green-600 hover:bg-green-700">
                <LogIn className="h-5 w-5 mr-2" />
                Get Started
              </Button>
              <Button onClick={() => navigate('/search')} variant="outline" size="lg">
                <Search className="h-5 w-5 mr-2" />
                Browse Patterns
              </Button>
            </div>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => currentUser ? navigate('/stash') : navigate('/login')}>
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Package className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Manage Your Stash</h3>
              <p className="text-gray-600">
                Keep track of your yarn collection and crafting tools in one organized place.
              </p>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/search')}>
            <div className="text-center">
              <div className="bg-amber-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Search className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Pattern Search</h3>
              <p className="text-gray-600">
                Find patterns that perfectly match your available materials and project goals.
              </p>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/random')}>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shuffle className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Random Inspiration</h3>
              <p className="text-gray-600">
                Get surprised with random pattern suggestions based on your stash.
              </p>
            </div>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-lg shadow-md p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Make the Most of Your Materials?
          </h3>
          <p className="text-gray-600 mb-6">
            {currentUser 
              ? "Start by adding your yarn stash and tools, then discover patterns you can create right now."
              : "Join StitchMatch to start organizing your stash and finding perfect patterns."
            }
          </p>
          <div className="flex justify-center space-x-4">
            {currentUser ? (
              <>
                <Button onClick={() => navigate('/stash')} size="lg" className="bg-green-600 hover:bg-green-700">
                  Add My Stash
                </Button>
                <Button onClick={() => navigate('/search')} variant="outline" size="lg">
                  Search Patterns
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => navigate('/login')} size="lg" className="bg-green-600 hover:bg-green-700">
                  <UserPlus className="h-5 w-5 mr-2" />
                  Sign Up Free
                </Button>
                <Button onClick={() => navigate('/search')} variant="outline" size="lg">
                  <Search className="h-5 w-5 mr-2" />
                  Browse Patterns
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
