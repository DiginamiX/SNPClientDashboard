import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

type FormValues = z.infer<typeof formSchema>;

export default function Register() {
  const [isRegistering, setIsRegistering] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: ''
    }
  });

  const onSubmit = async (values: FormValues) => {
    setIsRegistering(true);
    try {
      const { confirmPassword, ...userData } = values;
      await register({ 
        ...userData,
        role: 'client', // Default role for new registrations
        clientData: {} // Empty client data object - will be populated later
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration failed',
        description: error.message || 'There was a problem with your registration. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="flex items-center justify-center mb-2">
              <svg 
                viewBox="0 0 100 100" 
                className="w-20 h-20 mb-2"
                style={{
                  filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.25))'
                }}
              >
                <defs>
                  <linearGradient id="registerLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                  <linearGradient id="registerLetterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#f0f0f0" />
                  </linearGradient>
                </defs>
                <rect width="100" height="100" rx="12" fill="url(#registerLogoGradient)" />
                
                {/* Stylized 'S' */}
                <path 
                  d="M30,30 C40,25 45,35 35,40 C25,45 45,55 45,65 C45,72 35,75 25,70" 
                  stroke="url(#registerLetterGradient)" 
                  strokeWidth="6" 
                  strokeLinecap="round" 
                  fill="none"
                />
                
                {/* Stylized 'N' */}
                <path 
                  d="M50,30 L50,70 M50,30 L70,70 M70,30 L70,70" 
                  stroke="url(#registerLetterGradient)" 
                  strokeWidth="6" 
                  strokeLinecap="round" 
                  fill="none"
                />
                
                {/* Stylized 'P' */}
                <path 
                  d="M75,30 L75,70 M75,30 C85,30 90,35 90,45 C90,55 85,60 75,60" 
                  stroke="url(#registerLetterGradient)" 
                  strokeWidth="6" 
                  strokeLinecap="round" 
                  fill="none"
                />
              </svg>
            </div>
            <span className="text-xl font-medium text-slate-700 dark:text-slate-300">
              Client Portal
            </span>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Create an Account</CardTitle>
          <CardDescription className="text-center">
            Enter your information to register
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John"
                          {...field}
                          disabled={isRegistering}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Doe"
                          {...field}
                          disabled={isRegistering}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john.doe@example.com"
                        {...field}
                        disabled={isRegistering}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="johndoe"
                        {...field}
                        disabled={isRegistering}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Choose a secure password"
                        {...field}
                        disabled={isRegistering}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Repeat your password"
                        {...field}
                        disabled={isRegistering}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-blue-600"
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <div className="text-sm text-center w-full text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link href="/login">
              <a className="text-primary hover:underline">Sign in</a>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
