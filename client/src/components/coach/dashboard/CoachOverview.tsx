import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/ui/metric-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useQuery } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { useToast } from "@/hooks/use-toast"

interface CoachStats {
  totalClients: number
  activeClients: number
  newClientsThisMonth: number
  retentionRate: number
  averageCompliance: number
  monthlyRevenue: number
}

interface RecentActivity {
  id: number
  type: 'workout_completed' | 'progress_photo' | 'weight_logged' | 'message_sent'
  clientName: string
  clientAvatar?: string
  description: string
  timestamp: string
}

export default function CoachOverview() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month')
  const [_, setLocation] = useLocation()
  const { toast } = useToast()

  // Mock data - replace with actual API calls
  const stats: CoachStats = {
    totalClients: 28,
    activeClients: 24,
    newClientsThisMonth: 4,
    retentionRate: 92,
    averageCompliance: 78,
    monthlyRevenue: 5600
  }

  const recentActivity: RecentActivity[] = [
    {
      id: 1,
      type: 'workout_completed',
      clientName: 'Sarah Johnson',
      clientAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face',
      description: 'Completed Upper Body Strength workout',
      timestamp: '2 hours ago'
    },
    {
      id: 2,
      type: 'progress_photo',
      clientName: 'Mike Chen',
      clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
      description: 'Uploaded new progress photos',
      timestamp: '4 hours ago'
    },
    {
      id: 3,
      type: 'weight_logged',
      clientName: 'Emma Wilson',
      clientAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face',
      description: 'Logged weight: 68.2kg (-0.8kg this week)',
      timestamp: '6 hours ago'
    },
    {
      id: 4,
      type: 'message_sent',
      clientName: 'David Park',
      clientAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
      description: 'Sent a message about nutrition adjustments',
      timestamp: '1 day ago'
    }
  ]

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'workout_completed':
        return <i className="ri-fitness-line text-green-500" />
      case 'progress_photo':
        return <i className="ri-camera-line text-blue-500" />
      case 'weight_logged':
        return <i className="ri-scales-3-line text-purple-500" />
      case 'message_sent':
        return <i className="ri-message-2-line text-orange-500" />
      default:
        return <i className="ri-information-line text-gray-500" />
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Coach Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor your clients' progress and manage your coaching business
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted rounded-lg p-1">
            {(['week', 'month', 'quarter'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="capitalize"
              >
                {range}
              </Button>
            ))}
          </div>
          
          <Button variant="default" size="lg" onClick={() => setLocation('/coach/clients')}>
            <i className="ri-add-line mr-2" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Clients"
          value={stats.totalClients}
          change={{
            value: `+${stats.newClientsThisMonth}`,
            type: 'increase'
          }}
          icon={<i className="ri-team-line text-primary w-5 h-5" />}
          variant="premium"
        />

        <MetricCard
          title="Active Clients"
          value={stats.activeClients}
          change={{
            value: `${Math.round((stats.activeClients / stats.totalClients) * 100)}%`,
            type: 'increase'
          }}
          icon={<i className="ri-user-heart-line text-green-500 w-5 h-5" />}
          variant="premium"
        />

        <MetricCard
          title="Retention Rate"
          value={`${stats.retentionRate}%`}
          change={{
            value: '+2%',
            type: 'increase'
          }}
          icon={<i className="ri-shield-check-line text-blue-500 w-5 h-5" />}
          variant="premium"
        />

        <MetricCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue.toLocaleString()}`}
          change={{
            value: '+12%',
            type: 'increase'
          }}
          icon={<i className="ri-money-dollar-circle-line text-green-500 w-5 h-5" />}
          variant="gradient-orange"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Compliance Overview */}
        <div className="lg:col-span-2">
          <Card variant="premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="ri-bar-chart-line text-primary" />
                Client Compliance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Compliance</span>
                  <Badge variant={stats.averageCompliance >= 80 ? 'default' : 'secondary'}>
                    {stats.averageCompliance}%
                  </Badge>
                </div>
                
                <div className="h-64 bg-gradient-to-br from-orange-50 to-blue-50 dark:from-orange-950/10 dark:to-blue-950/10 rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Compliance chart will render here</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">85%</div>
                    <div className="text-xs text-muted-foreground">Workout</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">72%</div>
                    <div className="text-xs text-muted-foreground">Nutrition</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">91%</div>
                    <div className="text-xs text-muted-foreground">Check-ins</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card variant="premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <i className="ri-notification-line text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {activity.clientAvatar ? (
                      <img
                        src={activity.clientAvatar}
                        alt={activity.clientName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      getActivityIcon(activity.type)
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {activity.clientName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.timestamp}
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              variant="ghost" 
              className="w-full mt-4"
              onClick={() => {
                toast({
                  title: "Feature Coming Soon",
                  description: "Activity history page is under development and will be available soon.",
                });
              }}
            >
              View All Activity
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card variant="premium">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => setLocation('/coach/workouts')}
            >
              <i className="ri-add-circle-line text-xl" />
              <span className="text-sm">New Workout</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => {
                toast({
                  title: "Feature Coming Soon",
                  description: "Meal plan creation is under development and will be available soon.",
                });
              }}
            >
              <i className="ri-restaurant-line text-xl" />
              <span className="text-sm">Create Meal Plan</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => setLocation('/messages')}
            >
              <i className="ri-message-2-line text-xl" />
              <span className="text-sm">Send Message</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => setLocation('/checkins')}
            >
              <i className="ri-calendar-event-line text-xl" />
              <span className="text-sm">Schedule Check-in</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
