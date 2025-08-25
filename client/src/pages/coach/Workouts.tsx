import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Dumbbell, Library, Zap, Users, Calendar } from 'lucide-react'
import ExerciseLibrary from '@/components/coach/workouts/ExerciseLibrary'
import WorkoutBuilder from '@/components/coach/workouts/WorkoutBuilder'
import ProgramBuilder from '@/components/coach/programs/ProgramBuilder'

export default function CoachWorkouts() {
  const [activeTab, setActiveTab] = useState('exercises')

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-gradient-orange">
            Workout Programming
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            Build comprehensive workout programs for your clients
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            Schedule Workouts
          </Button>
          <Button className="bg-gradient-to-r from-primary to-accent text-white gap-2">
            <Plus className="w-4 h-4" />
            New Program
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card variant="premium">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Library className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">156</p>
                <p className="text-sm text-muted-foreground">Exercises</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/10 rounded-lg">
                <Dumbbell className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">24</p>
                <p className="text-sm text-muted-foreground">Programs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Users className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">89</p>
                <p className="text-sm text-muted-foreground">Active Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Zap className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">94%</p>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="exercises" className="gap-2">
            <Library className="w-4 h-4" />
            Exercise Library
          </TabsTrigger>
          <TabsTrigger value="builder" className="gap-2">
            <Dumbbell className="w-4 h-4" />
            Workout Builder
          </TabsTrigger>
          <TabsTrigger value="programs" className="gap-2">
            <Calendar className="w-4 h-4" />
            Programs
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2" disabled>
            <Users className="w-4 h-4" />
            Assignments
            <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exercises" className="mt-8">
          <ExerciseLibrary />
        </TabsContent>

        <TabsContent value="builder" className="mt-8">
          <WorkoutBuilder />
        </TabsContent>

        <TabsContent value="programs" className="mt-8">
          <ProgramBuilder />
        </TabsContent>

        <TabsContent value="assignments" className="mt-8">
          <Card variant="premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Client Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Assignment System Coming Soon</h3>
                  <p className="text-muted-foreground mb-6">
                    Assign and track workout programs for your clients
                  </p>
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Bulk program assignments</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Real-time progress tracking</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Automated check-ins</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Performance analytics</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
