import CoachOverview from "@/components/coach/dashboard/CoachOverview"
import { useAuth } from "@/hooks/useAuth"
import { useEffect } from "react"
import { useLocation } from "wouter"

export default function CoachDashboard() {
  const { user, loading } = useAuth()
  const [_, setLocation] = useLocation()

  useEffect(() => {
    // Redirect non-admin users to client dashboard
    if (!loading && user && user.role !== 'admin') {
      setLocation('/')
    }
  }, [user, loading, setLocation])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null // Will redirect in useEffect
  }

  return <CoachOverview />
}
