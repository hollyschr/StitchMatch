import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Scissors, Package, Search, Shuffle, LogIn, UserPlus, Heart, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';

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
      <Header />
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
