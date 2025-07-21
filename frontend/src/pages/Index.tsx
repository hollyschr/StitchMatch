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
              {/* <Scissors className="h-8 w-8 text-green-600" /> */}
              <svg width="32" height="32" viewBox="0 0 512 512" className="h-8 w-8" style={{ fill: '#16A34A' }}>
                <path d="M384.9,0.9c4.8,2.3,8.6,4.9,12.1,9.1c0.7,0.8,1.5,1.7,2.2,2.6c1.7,2.4,2.4,3.6,2.8,6.4c0.1,1,0.2,2.1,0.4,3.1C401.4,32,395,39.4,388,46c-4.8,3.9-9.8,6.9-15.4,9.5c-6.4,3.5-9,7.9-12.4,14.2c-1.2,2.2-2.4,4.3-3.6,6.5c-0.6,1.1-1.2,2.2-1.8,3.4c-3,5.5-6.1,10.9-9.3,16.3c-1.3,2.2-2.5,4.4-3.8,6.6c-3.1,5.4-6.3,10.9-9.4,16.3c-1.2,2.1-2.5,4.3-3.7,6.4c-2.9,5.1-5.9,10.2-8.9,15.3c-1.4,2.4-2.8,4.8-4.2,7.2c-1,1.7-2,3.4-3,5.1c-0.9,1.5-0.9,1.5-1.8,3.1c-0.5,0.9-1.1,1.8-1.6,2.8c-1.4,2.3-1.4,2.3-1.1,5.3c2.4,1.8,4.8,3.5,7.3,5.1c8,5.4,15.7,11,22.6,17.7c0.5,0.5,1,0.9,1.5,1.4c1.4,1.3,2.7,2.7,4.1,4c2.3,2,2.3,2,4.9,1.5c2.8-0.8,5-1.9,7.5-3.4c0.9-0.6,1.9-1.1,2.8-1.7c1-0.6,2-1.2,3-1.8c2.2-1.3,4.3-2.6,6.5-3.9c1.1-0.7,2.2-1.3,3.4-2c5.4-3.2,10.8-6.3,16.3-9.4c2.2-1.2,4.3-2.5,6.5-3.8c1.1-0.6,2.2-1.2,3.3-1.9c2.8-1.6,5.7-3.3,8.5-4.9c1.7-1,3.5-2,5.2-3c2.2-1.3,4.5-2.6,6.7-3.9c4.4-2.6,8.8-5.1,13.4-7.3c8.6-4.2,11.9-8.7,15.8-17.1c4.7-10.2,13.2-18.2,23.3-22.9c5.3-1.7,10.5-1.5,15.6,0.7c7,4,11.6,11.9,13.8,19.5c0.8,5.8,0.9,11.5-2.6,16.4c-9.2,10-22.7,11.9-35.5,12.5c-3.9,0.1-3.9,0.1-6-0.1c-7.5-0.6-12.6,2.8-18.9,6.6c-1.1,0.6-2.2,1.3-3.4,1.9c-3.2,1.9-6.4,3.8-9.6,5.7c-1.5,0.9-3,1.8-4.5,2.6c-2.7,1.6-5.3,3.1-8,4.7c-5.7,3.4-11.5,6.7-17.2,10c-11.8,6.8-23.6,13.7-35.3,20.7c2.3,4.3,4.9,8.2,7.8,12.2c4.2,5.7,7.6,11.7,10.8,18c0.6,1.1,1.1,2.2,1.7,3.3c23.5,46.6,24.6,98.9,8.5,147.9c-0.4,1.3-0.4,1.3-0.8,2.5c-0.3,0.9-0.6,1.8-0.9,2.7c-0.7,2.1-1.4,4.2-2.1,6.3c0.6,0.2,1.1,0.4,1.7,0.6c21.9,7.8,46,17.7,56.6,40.1c4.1,9.7,5.1,18.7,1.8,28.9c-5.6,13.4-17.3,22.9-30.4,28.4c-15.4,6.1-31,9.2-47.6,9.3c-1.3,0-1.3,0-2.5,0c-2.7,0-5.4,0-8.1,0c-0.9,0-1.9,0-2.8,0c-21.8,0-43.3-1.7-64.9-5.4c-9.3-1.5-17.1,0.4-26,3c-36,10-75.2,9.2-110.7-2.9c-1-0.3-1-0.3-1.9-0.6c-14-4.6-27.8-11.2-39.8-19.7c-3.5-2.4-5.7-3.4-10-2.8c-1.1,0.1-2.2,0.3-3.4,0.5c-1.3,0.2-2.5,0.4-3.8,0.7c-0.7,0.1-1.5,0.2-2.2,0.4c-22.5,3.7-44.3,10.9-63,24.3c-2.9,2-3.9,2.4-7.6,3c-3.2-0.6-3.2-0.6-5.6-2.2c-2.2-3.4-2.2-5.4-1.6-9.4c20.6-23.6,61.6-32,91.1-34.4c30.1-2,60.2,1,89.8,6.3c0.9,0.2,1.8,0.3,2.8,0.5c4.5,0.8,8.9,1.6,13.4,2.5c1.6,0.3,3.3,0.6,4.9,0.9c1.1,0.2,1.1,0.2,2.2,0.5c8.7,1.6,15.4-2.8,23-6.6c1.1-0.5,2.1-1.1,3.2-1.6c14.5-7.4,28.3-15.8,41.7-25c-13.2-8.3-13.2-8.3-27.9-10.4c-2.9,1.8-5.5,3.7-8.1,5.9c-4.2,3.2-8.9,5.5-13.5,7.9c-1,0.6-2,1.1-3.1,1.7c-7.2,3.9-14.6,7.4-22.1,10.8c-1,0.4-1.9,0.9-2.9,1.3c-8.4,3.6-8.4,3.6-13.5,2.9c-2.9-1.5-2.9-1.5-5-4c-0.7-2.8-0.9-5.2,0-8c4-4.1,9.1-6,14.3-8.2c13.3-5.9,26.2-12.2,38.7-19.8c-2-1.2-4-2.5-5.9-3.7c-1.1-0.7-2.2-1.4-3.3-2.1c-0.6-0.3-1.2-0.7-1.8-1.1c-1.9-1.2-1.9-1.2-4-2.7c-2.3-1.6-4.2-2.7-7-3.4c-4.2,0.9-7.7,2.9-11.4,5.1c-2.2,1.2-4.4,2.3-6.7,3.5c-1.1,0.6-2.3,1.2-3.4,1.8C165,433.4,123.3,445,87,445c0.1,0.9,0.2,1.8,0.3,2.8c-0.3,3.2-0.3,3.2-2.4,5.7c-2.9,1.6-2.9,1.6-6.3,1.8c-15-4.9-27-30-33.9-43.2C26.7,376.2,18.9,334.7,26,295c0.2-1.3,0.2-1.3,0.5-2.6c6.7-36.7,23.4-68.9,48.5-96.4c0.5-0.5,0.9-1,1.4-1.6c26-28.2,61.7-45.6,98.9-53.4c1.1-0.2,2.1-0.4,3.2-0.7c11.2-2.2,11.2-2.2,16.3,0.7c1.9,3.2,1.7,6.4,1.1,9.9c-1.3,2.4-1.3,2.4-4,4c-1.9,0.3-3.8,0.5-5.7,0.6c-1,0.1-2,0.2-3,0.2c-0.8,0.1-1.5,0.1-2.3,0.2c1.4,3.4,2.9,6.8,4.3,10.2c0.4,1,0.8,1.9,1.2,2.9c0.4,0.9,0.8,1.9,1.2,2.8c0.4,0.9,0.7,1.7,1.1,2.6c1.2,2.6,2.6,5,4.2,7.5c0.7-0.3,1.4-0.5,2.1-0.8c21.3-8,42.7-14.4,64.9-19.2c-9.5-3.6-19.4-5.4-29.4-6.5c-0.7-0.1-1.4-0.2-2.2-0.2c-2-0.2-4-0.4-6-0.6c-3.4-0.6-4.9-1.2-7.3-3.6c-1.2-3.6-1.3-5.3,0.2-8.8c1.8-2.2,1.8-2.2,4.8-4.2c24.4-1.3,49.7,7.9,72,17c0.8-1.5,0.8-1.5,1.7-3.1c5.4-9.9,11-19.6,16.7-29.3c4.6-7.8,9.1-15.7,13.6-23.6c5.2-9.1,10.4-18.1,15.6-27.1c0.6-1,1.1-1.9,1.7-2.9c0.5-0.9,1.1-1.8,1.6-2.7c0.8-1.3,0.8-1.3,1.5-2.7c1-1.7,2.1-3.5,3.3-5.1c4-6,5-10,4.4-17.1C351.6,29.1,353.3,16,361,6C367.7-0.8,375.8-2,384.9,0.9z" />
              </svg>
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
              <Button onClick={() => navigate('/login')} size="lg" className="bg-green-600 hover:bg-green-700 !bg-opacity-100">
                <LogIn className="h-5 w-5 mr-2" />
                Get Started
              </Button>
              <Button onClick={() => navigate('/search')} size="lg" className="bg-slate-700 hover:bg-slate-800 text-white">
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
                <Button onClick={() => navigate('/stash')} size="lg" className="bg-green-600 hover:bg-green-700 !bg-opacity-100">
                  Add My Stash
                </Button>
                <Button onClick={() => navigate('/search')} variant="outline" size="lg">
                  Search Patterns
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => navigate('/login')} size="lg" className="bg-green-600 hover:bg-green-700 !bg-opacity-100">
                  <UserPlus className="h-5 w-5 mr-2" />
                  Sign Up Free
                </Button>
                <Button onClick={() => navigate('/search')} size="lg" className="bg-slate-700 hover:bg-slate-800 text-white">
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
