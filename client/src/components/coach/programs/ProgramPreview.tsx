import React from 'react'
import { X, Calendar, Clock, Target, Users, Trophy } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Workout {
  id?: number
  name: string
  description: string
  estimated_duration: number
  difficulty_rating: number
  workout_type: 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'recovery'
  day_number: number
  week_number: number
  exercises: any[]
}

interface ProgramData {
  name: string
  description: string
  duration_weeks: number
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  program_type: 'strength' | 'cardio' | 'hybrid' | 'flexibility' | 'sports_specific'
  target_goals: string[]
  estimated_hours_per_week: number
  is_template: boolean
  is_public: boolean
  tags: string[]
}

interface ProgramPreviewProps {
  program: ProgramData
  workouts: Workout[]
  open: boolean
  onClose: () => void
}

const workoutTypeColors = {
  strength: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  cardio: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  hiit: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  flexibility: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  recovery: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
}

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function ProgramPreview({ program, workouts, open, onClose }: ProgramPreviewProps) {
  const getWorkoutsForWeek = (week: number) => {
    return workouts.filter(w => w.week_number === week)
  }

  const getTotalWorkouts = () => workouts.length
  const getAverageWorkoutsPerWeek = () => Math.round(workouts.length / program.duration_weeks * 10) / 10
  const getTotalHours = () => {
    return workouts.reduce((total, w) => total + w.estimated_duration, 0) / 60
  }

  const getWorkoutTypeDistribution = () => {
    const distribution: Record<string, number> = {}
    workouts.forEach(w => {
      distribution[w.workout_type] = (distribution[w.workout_type] || 0) + 1
    })
    return distribution
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-display text-gradient-orange">
                {program.name}
              </DialogTitle>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={difficultyColors[program.difficulty_level]}>
                  {program.difficulty_level}
                </Badge>
                <Badge variant="outline">
                  {program.duration_weeks} weeks
                </Badge>
                <Badge variant="outline">
                  {program.program_type}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Program Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card variant="glass">
                <CardContent className="p-4 text-center">
                  <Calendar className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{program.duration_weeks}</div>
                  <div className="text-sm text-muted-foreground">Weeks</div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardContent className="p-4 text-center">
                  <Target className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{getTotalWorkouts()}</div>
                  <div className="text-sm text-muted-foreground">Workouts</div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardContent className="p-4 text-center">
                  <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{Math.round(getTotalHours())}</div>
                  <div className="text-sm text-muted-foreground">Total Hours</div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardContent className="p-4 text-center">
                  <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{getAverageWorkoutsPerWeek()}</div>
                  <div className="text-sm text-muted-foreground">Per Week</div>
                </CardContent>
              </Card>
            </div>

            {/* Program Description */}
            {program.description && (
              <Card variant="premium">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">Program Description</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {program.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Target Goals */}
            {program.target_goals.length > 0 && (
              <Card variant="glass">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Target Goals</h3>
                  <div className="flex flex-wrap gap-2">
                    {program.target_goals.map(goal => (
                      <Badge key={goal} variant="secondary">
                        {goal.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Workout Type Distribution */}
            <Card variant="glass">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Workout Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Object.entries(getWorkoutTypeDistribution()).map(([type, count]) => (
                    <div key={type} className="text-center">
                      <div className="text-xl font-bold text-primary">{count}</div>
                      <Badge className={`${workoutTypeColors[type as keyof typeof workoutTypeColors]} text-xs`}>
                        {type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Schedule */}
            <Tabs defaultValue="1" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Weekly Schedule</h3>
                <TabsList>
                  {Array.from({ length: Math.min(program.duration_weeks, 6) }, (_, i) => (
                    <TabsTrigger key={i + 1} value={(i + 1).toString()}>
                      Week {i + 1}
                    </TabsTrigger>
                  ))}
                  {program.duration_weeks > 6 && (
                    <TabsTrigger value="more">...</TabsTrigger>
                  )}
                </TabsList>
              </div>

              {Array.from({ length: program.duration_weeks }, (_, i) => i + 1).map(week => (
                <TabsContent key={week} value={week.toString()}>
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                    {daysOfWeek.map((day, dayIndex) => {
                      const workout = getWorkoutsForWeek(week).find(w => w.day_number === dayIndex + 1)
                      
                      return (
                        <Card
                          key={dayIndex}
                          variant={workout ? "premium" : "glass"}
                          className={`min-h-24 ${!workout ? 'opacity-50' : ''}`}
                        >
                          <CardContent className="p-3">
                            <div className="text-center mb-2">
                              <div className="font-medium text-sm">{day}</div>
                            </div>

                            {workout ? (
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm truncate" title={workout.name}>
                                  {workout.name}
                                </h4>
                                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{workout.estimated_duration}min</span>
                                </div>
                                <Badge 
                                  className={`${workoutTypeColors[workout.workout_type]} text-xs w-full justify-center`}
                                  size="sm"
                                >
                                  {workout.workout_type}
                                </Badge>
                              </div>
                            ) : (
                              <div className="text-center text-muted-foreground text-xs">
                                Rest Day
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* Program Tags */}
            {program.tags.length > 0 && (
              <Card variant="glass">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {program.tags.map(tag => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              This is how your program will appear to clients
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close Preview
              </Button>
              <Button className="bg-gradient-to-r from-primary to-accent text-white">
                Assign to Clients
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
