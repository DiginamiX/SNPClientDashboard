import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Pause, Play, SkipForward, MoreVertical, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase'
import { useLocation } from 'wouter'
import ExerciseDisplay from './ExerciseDisplay'
import SetLogger from './SetLogger'
import RestTimer from './RestTimer'
import WorkoutComplete from './WorkoutComplete'

interface Exercise {
  id: number
  name: string
  description: string
  instructions: string
  muscle_groups: string[]
  equipment: string
  video_url?: string
  thumbnail_url?: string
  category: string
}

interface WorkoutExercise {
  id: number
  exercise: Exercise
  sets: number
  reps: string
  weight: string
  rest_seconds: number
  notes: string
  order_index: number
  rpe_target?: number
  tempo?: string
}

interface WorkoutSession {
  id: number
  workout_id: number
  status: 'in_progress' | 'completed' | 'paused'
  start_time: string
  current_exercise_index: number
  current_set: number
  exercises_completed: number
  total_exercises: number
}

interface ExerciseSet {
  id?: number
  set_number: number
  actual_reps: number
  actual_weight: number
  rpe: number
  notes?: string
}

interface WorkoutPlayerProps {
  assignmentId: number
}

export default function WorkoutPlayer({ assignmentId }: WorkoutPlayerProps) {
  const [workout, setWorkout] = useState<any>(null)
  const [workoutSession, setWorkoutSession] = useState<WorkoutSession | null>(null)
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [completedSets, setCompletedSets] = useState<Record<string, ExerciseSet[]>>({})
  const [isResting, setIsResting] = useState(false)
  const [restTimeRemaining, setRestTimeRemaining] = useState(0)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [isWorkoutComplete, setIsWorkoutComplete] = useState(false)
  const [loading, setLoading] = useState(true)
  const [, setLocation] = useLocation()

  const { user } = useSupabaseAuth()
  const startTimeRef = useRef<Date | null>(null)

  useEffect(() => {
    if (user) {
      loadWorkout()
    }
  }, [assignmentId, user])

  const loadWorkout = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Get workout assignment with full workout details
      const { data: assignment, error: assignmentError } = await supabase
        .from('workout_assignments')
        .select(`
          id,
          workout_id,
          scheduled_date,
          status,
          notes,
          workouts!inner (
            id,
            name,
            description,
            estimated_duration,
            difficulty_rating,
            workout_type,
            instructions,
            workout_exercises (
              id,
              order_index,
              sets,
              reps,
              weight,
              rest_seconds,
              notes,
              rpe_target,
              tempo,
              exercises (
                id,
                name,
                description,
                instructions,
                muscle_groups,
                equipment,
                video_url,
                thumbnail_url,
                category
              )
            )
          )
        `)
        .eq('id', assignmentId)
        .eq('client_id', user.id)
        .single()

      if (assignmentError) throw assignmentError

      const workoutData = assignment.workouts
      const exerciseData = workoutData.workout_exercises
        .sort((a, b) => a.order_index - b.order_index)
        .map(we => ({
          ...we,
          exercise: we.exercises
        }))

      setWorkout(workoutData)
      setExercises(exerciseData)

      // Check if there's an existing workout session
      const { data: existingSession, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', user.id)
        .eq('workout_id', workoutData.id)
        .eq('status', 'in_progress')
        .maybeSingle()

      if (sessionError && sessionError.code !== 'PGRST116') {
        throw sessionError
      }

      if (existingSession) {
        setWorkoutSession(existingSession)
        setCurrentExerciseIndex(existingSession.current_exercise_index || 0)
        setCurrentSet(existingSession.current_set || 1)
        
        // Load completed sets
        const { data: sets } = await supabase
          .from('exercise_sets')
          .select('*')
          .eq('workout_session_id', existingSession.id)

        if (sets) {
          const setsMap: Record<string, ExerciseSet[]> = {}
          sets.forEach(set => {
            const key = `${set.workout_exercise_id}`
            if (!setsMap[key]) setsMap[key] = []
            setsMap[key].push({
              id: set.id,
              set_number: set.set_number,
              actual_reps: set.actual_reps,
              actual_weight: set.actual_weight,
              rpe: set.rpe,
              notes: set.notes
            })
          })
          setCompletedSets(setsMap)
        }
      } else {
        // Create new workout session
        const { data: newSession, error: createError } = await supabase
          .from('workout_sessions')
          .insert({
            client_id: user.id,
            workout_id: workoutData.id,
            start_time: new Date().toISOString(),
            status: 'in_progress',
            total_exercises: exerciseData.length,
            exercises_completed: 0,
            current_exercise_index: 0,
            current_set: 1
          })
          .select()
          .single()

        if (createError) throw createError
        setWorkoutSession(newSession)
        startTimeRef.current = new Date()
      }

    } catch (error) {
      console.error('Error loading workout:', error)
      setLocation('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const logSet = async (setData: Omit<ExerciseSet, 'id'>) => {
    if (!workoutSession || !exercises[currentExerciseIndex]) return

    const workoutExercise = exercises[currentExerciseIndex]
    
    try {
      // Save set to database
      const { data: savedSet, error } = await supabase
        .from('exercise_sets')
        .insert({
          workout_session_id: workoutSession.id,
          workout_exercise_id: workoutExercise.id,
          exercise_id: workoutExercise.exercise.id,
          set_number: setData.set_number,
          prescribed_reps: workoutExercise.reps,
          actual_reps: setData.actual_reps,
          prescribed_weight: workoutExercise.weight,
          actual_weight: setData.actual_weight,
          weight_unit: 'lbs', // TODO: Get from user preferences
          rpe: setData.rpe,
          rest_duration: 0, // Will be updated when rest completes
          prescribed_rest: workoutExercise.rest_seconds,
          notes: setData.notes
        })
        .select()
        .single()

      if (error) throw error

      // Update local state
      const exerciseKey = `${workoutExercise.id}`
      setCompletedSets(prev => ({
        ...prev,
        [exerciseKey]: [...(prev[exerciseKey] || []), { ...setData, id: savedSet.id }]
      }))

      // Check if exercise is complete
      const completedSetsForExercise = (completedSets[exerciseKey] || []).length + 1
      
      if (completedSetsForExercise >= workoutExercise.sets) {
        // Exercise complete, move to next
        if (currentExerciseIndex < exercises.length - 1) {
          setCurrentExerciseIndex(prev => prev + 1)
          setCurrentSet(1)
          
          // Update session
          await supabase
            .from('workout_sessions')
            .update({
              current_exercise_index: currentExerciseIndex + 1,
              current_set: 1,
              exercises_completed: currentExerciseIndex + 1
            })
            .eq('id', workoutSession.id)
        } else {
          // Workout complete
          completeWorkout()
        }
      } else {
        // More sets in current exercise
        setCurrentSet(prev => prev + 1)
        
        // Start rest timer
        if (workoutExercise.rest_seconds > 0) {
          setRestTimeRemaining(workoutExercise.rest_seconds)
          setShowRestTimer(true)
          setIsResting(true)
        }
        
        // Update session
        await supabase
          .from('workout_sessions')
          .update({
            current_set: currentSet + 1
          })
          .eq('id', workoutSession.id)
      }

    } catch (error) {
      console.error('Error logging set:', error)
    }
  }

  const completeWorkout = async () => {
    if (!workoutSession) return

    try {
      const endTime = new Date()
      const duration = startTimeRef.current 
        ? Math.round((endTime.getTime() - startTimeRef.current.getTime()) / (1000 * 60))
        : workout?.estimated_duration || 0

      // Update workout session
      await supabase
        .from('workout_sessions')
        .update({
          status: 'completed',
          end_time: endTime.toISOString(),
          total_duration: duration,
          exercises_completed: exercises.length
        })
        .eq('id', workoutSession.id)

      // Update assignment status
      await supabase
        .from('workout_assignments')
        .update({ status: 'completed' })
        .eq('id', assignmentId)

      setIsWorkoutComplete(true)
    } catch (error) {
      console.error('Error completing workout:', error)
    }
  }

  const exitWorkout = () => {
    setLocation('/dashboard')
  }

  const pauseWorkout = async () => {
    if (!workoutSession) return

    try {
      await supabase
        .from('workout_sessions')
        .update({ status: 'paused' })
        .eq('id', workoutSession.id)
      
      setLocation('/dashboard')
    } catch (error) {
      console.error('Error pausing workout:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" variant="orange" />
      </div>
    )
  }

  if (isWorkoutComplete) {
    return (
      <WorkoutComplete
        workout={workout}
        workoutSession={workoutSession!}
        completedSets={completedSets}
        onExit={exitWorkout}
      />
    )
  }

  if (!workout || !workoutSession || exercises.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Workout not found</h2>
            <p className="text-muted-foreground mb-4">
              Unable to load workout details
            </p>
            <Button onClick={exitWorkout}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentExercise = exercises[currentExerciseIndex]
  const progress = ((currentExerciseIndex) / exercises.length) * 100
  const exerciseKey = `${currentExercise.id}`
  const setsCompleted = (completedSets[exerciseKey] || []).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={exitWorkout}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 mx-4">
            <h1 className="font-semibold text-center truncate">{workout.name}</h1>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>Exercise {currentExerciseIndex + 1} of {exercises.length}</span>
              <span>•</span>
              <span>Set {currentSet} of {currentExercise.sets}</span>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={pauseWorkout}>
            <Pause className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-4">
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Exercise Display */}
        <div className="flex-1 overflow-auto">
          <ExerciseDisplay
            exercise={currentExercise}
            currentSet={currentSet}
            completedSets={completedSets[exerciseKey] || []}
          />
        </div>

        {/* Set Logger */}
        <div className="border-t bg-card/50 backdrop-blur-sm">
          <SetLogger
            exercise={currentExercise}
            setNumber={currentSet}
            previousSets={completedSets[exerciseKey] || []}
            onLogSet={logSet}
            isResting={isResting}
          />
        </div>
      </div>

      {/* Rest Timer Modal */}
      {showRestTimer && (
        <RestTimer
          duration={restTimeRemaining}
          onComplete={() => {
            setShowRestTimer(false)
            setIsResting(false)
          }}
          onSkip={() => {
            setShowRestTimer(false)
            setIsResting(false)
          }}
        />
      )}
    </div>
  )
}
