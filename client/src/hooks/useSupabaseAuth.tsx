import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { supabase, auth } from '../lib/supabase'
import { useLocation } from 'wouter'
import { useToast } from './use-toast'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  role: 'client' | 'admin' | null
  profile: any | null
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, role: 'client' | 'admin', additionalData?: any) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithOAuth: (provider: 'google' | 'github' | 'apple') => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: any) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    role: null,
    profile: null
  })
  
  const [_, setLocation] = useLocation()
  const { toast } = useToast()

  useEffect(() => {
    // Get initial session
    auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error)
        setAuthState(prev => ({ ...prev, loading: false }))
        return
      }

      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false
      }))
      
      if (session?.user) {
        fetchUserProfile(session.user.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false
        }))
        
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setAuthState(prev => ({ ...prev, role: null, profile: null }))
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      // Try to get user profile from our users table
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error fetching user profile:', error)
        return
      }
      
      setAuthState(prev => ({ 
        ...prev, 
        role: profile?.role || null,
        profile: profile || null
      }))
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
    }
  }

  const signUp = async (email: string, password: string, role: 'client' | 'admin', additionalData?: any) => {
    try {
      const { data, error } = await auth.signUp(email, password, {
        role,
        ...additionalData
      })
      
      if (error) throw error
      
      // If signup successful, create user profile
      if (data.user && !error) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            username: email.split('@')[0], // Default username from email
            first_name: additionalData?.firstName || '',
            last_name: additionalData?.lastName || '',
            role: role
          })
        
        if (profileError) {
          console.error('Error creating user profile:', profileError)
        }
      }
      
      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      })
    } catch (error: any) {
      console.error('Signup error:', error)
      toast({
        title: 'Signup failed',
        description: error.message || 'An error occurred during signup',
        variant: 'destructive'
      })
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await auth.signIn(email, password)
      
      if (error) throw error
      
      // Redirect based on role
      const userRole = data.user?.user_metadata?.role || authState.role
      if (userRole === 'admin') {
        setLocation('/coach/dashboard')
      } else {
        setLocation('/')
      }
      
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      })
    } catch (error: any) {
      console.error('Signin error:', error)
      toast({
        title: 'Sign in failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive'
      })
      throw error
    }
  }

  const signInWithOAuth = async (provider: 'google' | 'github' | 'apple') => {
    try {
      const { data, error } = await auth.signInWithOAuth(provider)
      
      if (error) throw error
      
      toast({
        title: 'Redirecting...',
        description: `Signing in with ${provider}`,
      })
    } catch (error: any) {
      console.error('OAuth signin error:', error)
      toast({
        title: 'OAuth sign in failed',
        description: error.message || 'An error occurred during OAuth signin',
        variant: 'destructive'
      })
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await auth.signOut()
      
      if (error) throw error
      
      setLocation('/login')
      
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      })
    } catch (error: any) {
      console.error('Signout error:', error)
      toast({
        title: 'Sign out failed',
        description: error.message || 'An error occurred during signout',
        variant: 'destructive'
      })
    }
  }

  const updateProfile = async (updates: any) => {
    try {
      if (!authState.user) throw new Error('No user logged in')
      
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', authState.user.id)
      
      if (error) throw error
      
      // Refresh profile
      await fetchUserProfile(authState.user.id)
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      })
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast({
        title: 'Profile update failed',
        description: error.message || 'An error occurred while updating profile',
        variant: 'destructive'
      })
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{
      ...authState,
      signUp,
      signIn,
      signInWithOAuth,
      signOut,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider')
  }
  return context
}

// Compatibility layer with existing useAuth hook
export function useAuth() {
  const supabaseAuth = useSupabaseAuth()
  
  return {
    user: supabaseAuth.profile || {
      id: supabaseAuth.user?.id,
      email: supabaseAuth.user?.email,
      firstName: supabaseAuth.profile?.first_name,
      lastName: supabaseAuth.profile?.last_name,
      role: supabaseAuth.role,
      avatar: supabaseAuth.profile?.avatar
    },
    loading: supabaseAuth.loading,
    login: supabaseAuth.signIn,
    register: async (userData: any) => {
      await supabaseAuth.signUp(
        userData.email,
        userData.password,
        userData.role || 'client',
        {
          firstName: userData.firstName,
          lastName: userData.lastName
        }
      )
    },
    logout: supabaseAuth.signOut
  }
}
