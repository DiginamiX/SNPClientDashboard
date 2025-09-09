import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      console.log('🔍 Frontend: Starting login...', { username });
      
      // Use the simple login endpoint that works with database
      const response = await fetch('/api/auth/login-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ Login failed:', data);
        throw new Error(data.message || 'Login failed');
      }
      
      console.log('✅ Login successful:', data);
      setUser(data.user);
      
      // Navigate based on role
      if (data.user.role === 'admin') {
        setLocation('/coach');
      } else {
        setLocation('/');
      }
      
      toast({
        title: 'Welcome back!',
        description: `You've successfully logged in.`,
      });
    } catch (error) {
      console.error('Login failed:', error);
      toast({
        title: 'Login failed',
        description: error.message || 'An error occurred during login',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any) => {
    setLoading(true);
    try {
      console.log('🔍 Frontend: Starting registration...', { email: userData.email, role: userData.role });
      
      // Use the Supabase registration endpoint
      const response = await fetch('/api/auth/register-supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ Registration failed:', data);
        throw new Error(data.message || 'Registration failed');
      }
      
      console.log('✅ Registration successful:', data);
      setUser(data.user);
      
      // Navigate based on role
      if (data.user.role === 'admin') {
        setLocation('/coach');
      } else {
        setLocation('/');
      }
      
      toast({
        title: 'Account created!',
        description: `Welcome ${data.user.first_name}! You have successfully registered.`,
      });
    } catch (error) {
      console.error('Registration failed:', error);
      toast({
        title: 'Registration failed',
        description: error.message || 'An error occurred during registration',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout', {});
      setUser(null);
      setLocation('/login');
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        title: 'Error',
        description: 'There was a problem logging you out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
