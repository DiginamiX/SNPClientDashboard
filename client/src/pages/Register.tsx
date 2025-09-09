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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['client', 'admin'], { required_error: 'Please select a role' })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

type FormValues = z.infer<typeof formSchema>;

export default function Register() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'client'
    }
  });

  // Update role when coach toggle changes
  const handleCoachToggle = (checked: boolean) => {
    setIsCoach(checked);
    form.setValue('role', checked ? 'admin' : 'client');
  };

  const onSubmit = async (values: FormValues) => {
    setIsRegistering(true);
    try {
      console.log('🔍 Registration form submission:', { 
        email: values.email, 
        username: values.username, 
        role: values.role 
      });
      
      const { confirmPassword, ...userData } = values;
      await register(userData);
      
      toast({
        title: 'Success!',
        description: `Welcome ${userData.firstName}! Your ${userData.role === 'admin' ? 'coach' : 'client'} account has been created.`,
      });
      
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'An error occurred during registration. Please try again.',
        variant: 'destructive',
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
              <img 
                src="/snp-logo.png" 
                alt="Stuart Nutrition and Performance" 
                className="h-20 mb-2"
                style={{
                  filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.15))'
                }}
              />
            </div>
            <span className="text-xl font-medium text-slate-700 dark:text-slate-300">
              Client Portal
            </span>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Create an Account</CardTitle>
          <CardDescription className="text-center">
            Join as a {isCoach ? 'Coach' : 'Client'} and start your fitness journey
          </CardDescription>
          
          {/* Role Toggle */}
          <div className="flex items-center justify-center space-x-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <Badge variant={!isCoach ? "default" : "secondary"} className="px-3 py-1">
                <i className="ri-user-line mr-1"></i>
                Client
              </Badge>
              <Switch
                checked={isCoach}
                onCheckedChange={handleCoachToggle}
                className="mx-2"
              />
              <Badge variant={isCoach ? "default" : "secondary"} className="px-3 py-1">
                <i className="ri-team-line mr-1"></i>
                Coach
              </Badge>
            </div>
          </div>
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
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Choose a unique username"
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
                className="w-full"
                disabled={isRegistering}
                variant={isCoach ? "premium" : "default"}
              >
                {isRegistering ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Creating {isCoach ? 'Coach' : 'Client'} Account...
                  </>
                ) : (
                  <>
                    <i className={`${isCoach ? 'ri-team-line' : 'ri-user-line'} mr-2`}></i>
                    Create {isCoach ? 'Coach' : 'Client'} Account
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <div className="text-sm text-center w-full text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
