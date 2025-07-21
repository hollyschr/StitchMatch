import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Scissors, LogOut, User, Heart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface User {
  user_id: number;
  name: string;
  email: string;
  profile_photo?: string;
}

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    navigate('/');
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
            {/* <Scissors className="h-8 w-8 text-green-600" /> */}
            <img src="/needle.png" alt="Needle Logo" className="h-8 w-8" style={{ filter: 'brightness(0) saturate(100%) sepia(100%) hue-rotate(85deg) saturate(600%) brightness(90%)' }} />
            <h1 className="text-2xl font-bold text-gray-900">StitchMatch</h1>
          </div>
          <nav className="flex items-center space-x-4">
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
                <div className="flex items-center space-x-6">
                  <span className="text-sm text-gray-600">Welcome, {currentUser.name}</span>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-1" />
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  variant={location.pathname === '/search' ? 'outline' : 'ghost'}
                  onClick={() => navigate('/search')}
                >
                  Search
                </Button>
                <Button onClick={() => navigate('/login')}>
                  <User className="h-4 w-4 mr-2" />
                  Login
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;