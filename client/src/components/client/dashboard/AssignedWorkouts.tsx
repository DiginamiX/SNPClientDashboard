import React, { useState, useEffect } from 'react'
import { Play, Clock, Target, CheckCircle, Calendar, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase'
import { useLocation } from 'wouter'
import { formatDistanceToNow, isToday, isTomorrow, format } from 'date-fns'

interface Workout {
  id: number
  name: string
  description: string
  estimated_duration: number
  difficulty_rating: number
  workout_type: string
  exercises: Array<{
    id: number
    exercise: {
      name: string
      muscle_groups: string[]
      equipment: string
      thumbnail_url?: string
    }
    sets: number
    reps: string
  }>
}

interface WorkoutAssignment {
  id: number
  workout_id: number
  scheduled_date: string
  status: 'assigned' | 'in_progress' | 'completed' | 'skipped'
  notes?: string
  assigned_by: string
  coach_name?: string
  workout: Workout
  workout_session?: {
    id: number
    status: string
    start_time: string
  }
}

const workoutTypeColors = {
  strength: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  cardio: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  hiit: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  flexibility: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  recovery: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
}

const statusColors = {
  assigned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  skipped: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
}

export default function AssignedWorkouts() {
  const [assignments, setAssignments] = useState<WorkoutAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [, setLocation] = useLocation()
  
  const { user } = useSupabaseAuth()

  useEffect(() => {
    if (user) {
      fetchAssignedWorkouts()
    }
  }, [user])

  const fetchAssignedWorkouts = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Get workout assignments with workout details
      const { data, error } = await supabase
        .from('workout_assignments')
        .select(`
          id,
          workout_id,
          scheduled_date,
          status,
          notes,
          assigned_by,
          workouts!inner (
            id,
            name,
            description,
            estimated_duration,
            difficulty_rating,
            workout_type,
            workout_exercises (
              id,
              sets,
              reps,
              exercises (
                id,
                name,
                muscle_groups,
                equipment,
                thumbnail_url
              )
            )
          ),
          workout_sessions (
            id,
            status,
            start_time
          )
        `)
        .eq('client_id', user.id)
        .gte('scheduled_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 7 days
        .order('scheduled_date', { ascending: true })

      if (error) throw error

      // Transform data to match interface
      const transformedData = data?.map((assignment: any) => ({
        ...assignment,
        workout: {
          ...assignment.workouts,
          exercises: assignment.workouts.workout_exercises.map((we: any) => ({
            ...we,
            exercise: we.exercises
          }))
        }
      })) || []

      setAssignments(transformedData)
    } catch (error) {
      console.error('Error fetching assigned workouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const startWorkout = (assignment: WorkoutAssignment) => {
    setLocation(`/workout/${assignment.id}`)
  }

  const continueWorkout = (assignment: WorkoutAssignment) => {
    setLocation(`/workout/${assignment.id}`)
  }


  // Group assignments by date
  const groupedAssignments = assignments.reduce((groups, assignment) => {
    const date = assignment.scheduled_date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(assignment)
    return groups
  }, {} as Record<string, WorkoutAssignment[]>)

  if (loading) {
    return (
      <Card variant="premium">
        <CardContent className="flex items-center justify-center h-48">
          <LoadingSpinner size="lg" variant="orange" />
        </CardContent>
      </Card>
    )
  }

  const todayAssignments = assignments.filter(a => isToday(new Date(a.scheduled_date)))
  const upcomingAssignments = assignments.filter(a => new Date(a.scheduled_date) > new Date() && !isToday(new Date(a.scheduled_date)))
  const pastAssignments = assignments.filter(a => new Date(a.scheduled_date) < new Date() && !isToday(new Date(a.scheduled_date)))

  return (
    <div className="space-y-6">
      {/* Today's Workouts */}
      {todayAssignments.length > 0 && (
        <div>
          <h2 className="text-2xl font-display font-bold text-gradient-orange mb-4">
            Today's Workouts
          </h2>
          <div className="grid gap-4">
            {todayAssignments.map(assignment => (
              <WorkoutCard
                key={assignment.id}
                assignment={assignment}
                onStart={() => startWorkout(assignment)}
                onContinue={() => continueWorkout(assignment)}
                priority
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Workouts */}
      {upcomingAssignments.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Upcoming Workouts</h3>
          <div className="grid gap-3">
            {upcomingAssignments.map(assignment => (
              <WorkoutCard
                key={assignment.id}
                assignment={assignment}
                onStart={() => startWorkout(assignment)}
                onContinue={() => continueWorkout(assignment)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Workouts */}
      {pastAssignments.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Recent Workouts</h3>
          <div className="grid gap-3">
            {pastAssignments.slice(0, 3).map(assignment => (
              <WorkoutCard
                key={assignment.id}
                assignment={assignment}
                onStart={() => startWorkout(assignment)}
                onContinue={() => continueWorkout(assignment)}
                past
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {assignments.length === 0 && (
        <Card variant="premium">
          <CardContent className="text-center py-12">
            <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Workouts Assigned</h3>
            <p className="text-muted-foreground">
              Your coach hasn't assigned any workouts yet. Check back later or reach out to your coach.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface WorkoutCardProps {
  assignment: WorkoutAssignment
  onStart: () => void
  onContinue: () => void
  priority?: boolean
  past?: boolean
}

function WorkoutCard({ assignment, onStart, onContinue, priority = false, past = false }: WorkoutCardProps) {
  const { workout, status, scheduled_date, workout_session } = assignment
  
  const getUniqueExercises = (workout: Workout) => {
    const uniqueExercises = new Map()
    workout.exercises.forEach(ex => {
      if (!uniqueExercises.has(ex.exercise.name)) {
        uniqueExercises.set(ex.exercise.name, ex.exercise)
      }
    })
    return Array.from(uniqueExercises.values())
  }

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'MMM d')
  }
  
  const uniqueExercises = getUniqueExercises(workout)
  const totalSets = workout.exercises.reduce((total, ex) => total + ex.sets, 0)
  
  const isInProgress = workout_session?.status === 'in_progress'
  const isCompleted = status === 'completed'
  
  const getActionButton = () => {
    if (isCompleted) {
      return (
        <Button variant="outline" disabled className="w-full">
          <CheckCircle className="w-4 h-4 mr-2" />
          Completed
        </Button>
      )
    }
    
    if (isInProgress) {
      return (
        <Button onClick={onContinue} className="w-full bg-gradient-to-r from-primary to-accent text-white">
          <Play className="w-4 h-4 mr-2" />
          Continue Workout
        </Button>
      )
    }
    
    if (past && !isCompleted) {
      return (
        <Button variant="outline" onClick={onStart} className="w-full">
          <Play className="w-4 h-4 mr-2" />
          Start Late
        </Button>
      )
    }
    
    return (
      <Button onClick={onStart} className="w-full bg-gradient-to-r from-primary to-accent text-white">
        <Play className="w-4 h-4 mr-2" />
        Start Workout
      </Button>
    )
  }

  return (
    <Card 
      variant={priority ? "premium" : "glass"}
      className={priority ? "border-primary/50 shadow-lg shadow-primary/10" : ""}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          {/* Workout Thumbnail */}
          <div className="flex-shrink-0">
            {uniqueExercises[0]?.thumbnail_url ? (
              <img
                src={uniqueExercises[0].thumbnail_url}
                alt={workout.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <Target className="w-8 h-8 text-primary" />
              </div>
            )}
          </div>

          {/* Workout Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg truncate">{workout.name}</h3>
              <div className="flex items-center gap-2 ml-2">
                <Badge className={statusColors[status]}>
                  {status.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getDateLabel(scheduled_date)}
                </Badge>
              </div>
            </div>

            {workout.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {workout.description}
              </p>
            )}

            {/* Workout Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{workout.estimated_duration || 45} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                <span>{workout.exercises.length} exercises</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                <span>{totalSets} sets</span>
              </div>
            </div>

            {/* Workout Type and Difficulty */}
            <div className="flex items-center gap-2 mb-4">
              <Badge className={workoutTypeColors[workout.workout_type as keyof typeof workoutTypeColors]}>
                {workout.workout_type}
              </Badge>
              <div className="flex items-center gap-1">
                {Array.from({ length: workout.difficulty_rating || 1 }, (_, i) => (
                  <div key={i} className="w-2 h-2 bg-primary rounded-full" />
                ))}
                {Array.from({ length: 5 - (workout.difficulty_rating || 1) }, (_, i) => (
                  <div key={i} className="w-2 h-2 bg-muted rounded-full" />
                ))}
              </div>
            </div>

            {/* Exercise Preview */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium">Exercises:</span>
              <div className="flex flex-wrap gap-1">
                {uniqueExercises.slice(0, 3).map((exercise: any, index: number) => (
                  <Badge key={exercise.id} variant="secondary" className="text-xs">
                    {exercise.name}
                  </Badge>
                ))}
                {uniqueExercises.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{uniqueExercises.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {getActionButton()}

        {/* Coach Notes */}
        {assignment.notes && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Coach Notes:</span> {assignment.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
