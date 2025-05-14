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
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

type FormValues = z.infer<typeof formSchema>;

export default function Login() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: ''
    }
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoggingIn(true);
    try {
      await login(values.username, values.password);
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login failed',
        description: 'Invalid username or password. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="flex items-center justify-center mb-2">
              <div className="flex items-center justify-center text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white w-12 h-12 rounded-md mb-2">
                SNP
              </div>
            </div>
            <span className="text-xl font-medium text-slate-700 dark:text-slate-300">
              Client Portal
            </span>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your username"
                        {...field}
                        disabled={isLoggingIn}
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
                        placeholder="Enter your password"
                        {...field}
                        disabled={isLoggingIn}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-blue-600"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-slate-500 dark:text-slate-400">
            Don't have an account?{' '}
            <Link href="/register">
              <a className="text-primary hover:underline">Sign up</a>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
