import { useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useSupabaseAuth'

export default function EmailConfirmation() {
  const [_, setLocation] = useLocation()
  const { user } = useAuth()
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (user) {
      setIsVerified(true)
      setTimeout(() => {
        if (user.role === 'admin') {
          setLocation('/coach/dashboard')
        } else {
          setLocation('/')
        }
      }, 2000)
    }
  }, [user, setLocation])

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <CardTitle className="text-2xl font-bold text-green-900">Email Verified!</CardTitle>
            <CardDescription>
              Your email has been successfully verified. Redirecting to your dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Mail className="mx-auto h-12 w-12 text-blue-500" />
          <CardTitle className="text-2xl font-bold text-gray-900">Check Your Email</CardTitle>
          <CardDescription>
            We've sent you a verification link. Please check your email and click the link to verify your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600">
            <p>Didn't receive the email? Check your spam folder or try again.</p>
          </div>
          <div className="flex flex-col space-y-2">
            <Button variant="outline" asChild>
              <Link href="/register">Back to Registration</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Already verified? Sign In</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}