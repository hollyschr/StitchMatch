import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import API_CONFIG from '@/config/api';

interface User {
  user_id: number;
  name: string;
  email: string;
  profile_photo?: string;
}

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(event.currentTarget);
    const userData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      profile_photo: formData.get('profile_photo') as string || undefined,
    };

    try {
      const response = await fetch(`${API_CONFIG.endpoints.auth}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const user: User = await response.json();
        localStorage.setItem('currentUser', JSON.stringify(user));
        toast({ title: 'Registration successful!' });
        navigate('/');
      } else {
        const error = await response.json();
        toast({ title: error.detail || 'Registration failed' });
      }
    } catch (error) {
      toast({ title: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(event.currentTarget);
    const loginData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    try {
      const response = await fetch(`${API_CONFIG.endpoints.auth}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      if (response.ok) {
        const user: User = await response.json();
        localStorage.setItem('currentUser', JSON.stringify(user));
        toast({ title: 'Login successful!' });
        navigate('/');
      } else {
        const error = await response.json();
        toast({ title: error.detail || 'Login failed' });
      }
    } catch (error) {
      toast({ title: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E2F0FA] via-[#F9F9F6] to-[#FDFCFB]">
      <Header />
      
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to StitchMatch</h1>
          <p className="text-gray-600">Sign in to manage your patterns and stash</p>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input 
                    id="login-email" 
                    name="email" 
                    type="email" 
                    required 
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input 
                    id="login-password" 
                    name="password" 
                    type="password" 
                    required 
                    placeholder="Enter your password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="register-name">Full Name</Label>
                  <Input 
                    id="register-name" 
                    name="name" 
                    required 
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="register-email">Email</Label>
                  <Input 
                    id="register-email" 
                    name="email" 
                    type="email" 
                    required 
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <Label htmlFor="register-password">Password</Label>
                  <Input 
                    id="register-password" 
                    name="password" 
                    type="password" 
                    required 
                    placeholder="Create a password"
                  />
                </div>
                <div>
                  <Label htmlFor="profile-photo">Profile Photo URL (optional)</Label>
                  <Input 
                    id="profile-photo" 
                    name="profile_photo" 
                    type="url" 
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Login; 