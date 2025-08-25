import React, { useState, useCallback, useMemo } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  TouchSensor
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers'
import { Save, Eye, Users, Calendar, Plus, Settings, Timer, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/loading'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase'
import ExerciseDropZone from './ExerciseDropZone'
import WorkoutExerciseCard from './WorkoutExerciseCard'
import WorkoutSidebar from './WorkoutSidebar'
import WorkoutPreview from './WorkoutPreview'
import WorkoutAssignment from './WorkoutAssignment'

interface Exercise {
  id: number
  name: string
  description: string
  instructions: string
  muscle_groups: string[]
  equipment: string
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  video_url?: string
  thumbnail_url?: string
  category: string
}

interface WorkoutExercise {
  id: string // Unique ID for drag-and-drop
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

interface WorkoutBuilderState {
  name: string
  description: string
  instructions: string
  exercises: WorkoutExercise[]
  estimatedDuration: number
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  workout_type: 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'recovery'
}

const initialWorkoutState: WorkoutBuilderState = {
  name: '',
  description: '',
  instructions: '',
  exercises: [],
  estimatedDuration: 0,
  difficulty_level: 'beginner',
  workout_type: 'strength'
}

export default function WorkoutBuilder() {
  const [workout, setWorkout] = useState<WorkoutBuilderState>(initialWorkoutState)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedExercise, setDraggedExercise] = useState<Exercise | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showAssignment, setShowAssignment] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const { user } = useSupabaseAuth()

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Calculate estimated duration based on exercises
  const calculatedDuration = useMemo(() => {
    return workout.exercises.reduce((total, ex) => {
      const exerciseTime = ex.sets * 30 // 30 seconds per set estimate
      const restTime = ex.sets * ex.rest_seconds
      return total + exerciseTime + restTime
    }, 0) / 60 // Convert to minutes
  }, [workout.exercises])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)

    // Check if dragging from exercise library
    if (typeof active.data.current?.exercise === 'object') {
      setDraggedExercise(active.data.current.exercise)
    }
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Handle dropping exercise from library into workout
    if (active.data.current?.type === 'library-exercise' && over.data.current?.type === 'workout-dropzone') {
      const exercise = active.data.current.exercise as Exercise
      addExerciseToWorkout(exercise)
    }
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveId(null)
    setDraggedExercise(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Reorder exercises within workout
    if (active.data.current?.type === 'workout-exercise' && over.data.current?.type === 'workout-exercise') {
      setWorkout(prev => {
        const oldIndex = prev.exercises.findIndex(ex => ex.id === activeId)
        const newIndex = prev.exercises.findIndex(ex => ex.id === overId)
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newExercises = arrayMove(prev.exercises, oldIndex, newIndex).map((ex, index) => ({
            ...ex,
            order_index: index
          }))
          
          return {
            ...prev,
            exercises: newExercises
          }
        }
        return prev
      })
    }
  }, [])

  const addExerciseToWorkout = useCallback((exercise: Exercise) => {
    const newWorkoutExercise: WorkoutExercise = {
      id: `workout-exercise-${Date.now()}-${exercise.id}`,
      exercise,
      sets: 3,
      reps: '8-12',
      weight: '',
      rest_seconds: 60,
      notes: '',
      order_index: workout.exercises.length,
      rpe_target: 7
    }

    setWorkout(prev => ({
      ...prev,
      exercises: [...prev.exercises, newWorkoutExercise]
    }))
  }, [workout.exercises.length])

  const updateWorkoutExercise = useCallback((exerciseId: string, updates: Partial<WorkoutExercise>) => {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, ...updates } : ex
      )
    }))
  }, [])

  const removeExerciseFromWorkout = useCallback((exerciseId: string) => {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.filter(ex => ex.id !== exerciseId).map((ex, index) => ({
        ...ex,
        order_index: index
      }))
    }))
  }, [])

  const duplicateExercise = useCallback((exerciseId: string) => {
    const exercise = workout.exercises.find(ex => ex.id === exerciseId)
    if (exercise) {
      const duplicated: WorkoutExercise = {
        ...exercise,
        id: `workout-exercise-${Date.now()}-${exercise.exercise.id}`,
        order_index: workout.exercises.length
      }
      setWorkout(prev => ({
        ...prev,
        exercises: [...prev.exercises, duplicated]
      }))
    }
  }, [workout.exercises])

  const saveWorkout = async () => {
    if (!user || !workout.name.trim()) return

    setSaving(true)
    try {
      // Create workout
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          name: workout.name,
          description: workout.description,
          instructions: workout.instructions,
          estimated_duration: Math.round(calculatedDuration),
          difficulty_rating: workout.difficulty_level === 'beginner' ? 3 : workout.difficulty_level === 'intermediate' ? 6 : 9,
          workout_type: workout.workout_type
        })
        .select()
        .single()

      if (workoutError) throw workoutError

      // Create workout exercises
      const workoutExercises = workout.exercises.map(ex => ({
        workout_id: workoutData.id,
        exercise_id: ex.exercise.id,
        order_index: ex.order_index,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
        rpe_target: ex.rpe_target,
        tempo: ex.tempo
      }))

      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .insert(workoutExercises)

      if (exercisesError) throw exercisesError

      // Show assignment modal
      setShowAssignment(true)
      
    } catch (error) {
      console.error('Error saving workout:', error)
      // TODO: Show error toast
    } finally {
      setSaving(false)
    }
  }

  const resetWorkout = () => {
    setWorkout(initialWorkoutState)
  }

  return (
    <div className="flex h-screen bg-background">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
      >
        {/* Exercise Library Sidebar */}
        <WorkoutSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onExerciseSelect={addExerciseToWorkout}
        />

        {/* Main Workout Builder */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {sidebarOpen ? 'Hide' : 'Show'} Exercises
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="text-sm text-muted-foreground">
                    {workout.exercises.length} exercises • {Math.round(calculatedDuration)} min
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(true)}
                    disabled={workout.exercises.length === 0}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    onClick={saveWorkout}
                    disabled={!workout.name.trim() || workout.exercises.length === 0 || saving}
                    className="bg-gradient-to-r from-primary to-accent text-white"
                  >
                    {saving ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save & Assign
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Workout Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="workout-name">Workout Name *</Label>
                  <Input
                    id="workout-name"
                    value={workout.name}
                    onChange={(e) => setWorkout(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Upper Body Strength"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="workout-type">Type</Label>
                  <select
                    id="workout-type"
                    value={workout.workout_type}
                    onChange={(e) => setWorkout(prev => ({ ...prev, workout_type: e.target.value as any }))}
                    className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="strength">Strength</option>
                    <option value="cardio">Cardio</option>
                    <option value="hiit">HIIT</option>
                    <option value="flexibility">Flexibility</option>
                    <option value="recovery">Recovery</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <select
                    id="difficulty"
                    value={workout.difficulty_level}
                    onChange={(e) => setWorkout(prev => ({ ...prev, difficulty_level: e.target.value as any }))}
                    className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Workout Builder Area */}
          <div className="flex-1 p-6 overflow-auto">
            {workout.exercises.length === 0 ? (
              <ExerciseDropZone
                onExerciseDrop={addExerciseToWorkout}
                className="h-96"
              />
            ) : (
              <div className="space-y-4">
                <SortableContext
                  items={workout.exercises.map(ex => ex.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {workout.exercises.map((workoutExercise, index) => (
                    <WorkoutExerciseCard
                      key={workoutExercise.id}
                      workoutExercise={workoutExercise}
                      index={index + 1}
                      onUpdate={(updates) => updateWorkoutExercise(workoutExercise.id, updates)}
                      onRemove={() => removeExerciseFromWorkout(workoutExercise.id)}
                      onDuplicate={() => duplicateExercise(workoutExercise.id)}
                    />
                  ))}
                </SortableContext>

                {/* Add More Exercises Drop Zone */}
                <ExerciseDropZone
                  onExerciseDrop={addExerciseToWorkout}
                  className="h-24"
                  compact
                />
              </div>
            )}
          </div>

          {/* Workout Instructions */}
          {workout.exercises.length > 0 && (
            <div className="border-t bg-card/50 p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="workout-description">Description</Label>
                  <Textarea
                    id="workout-description"
                    value={workout.description}
                    onChange={(e) => setWorkout(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the workout goals and focus"
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="workout-instructions">Instructions</Label>
                  <Textarea
                    id="workout-instructions"
                    value={workout.instructions}
                    onChange={(e) => setWorkout(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder="Warm-up instructions, general notes, or coaching cues for the entire workout"
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId && draggedExercise && (
            <Card className="w-80 opacity-80 rotate-3 shadow-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{draggedExercise.name}</h4>
                    <p className="text-sm text-muted-foreground">{draggedExercise.category}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </DragOverlay>
      </DndContext>

      {/* Preview Modal */}
      {showPreview && (
        <WorkoutPreview
          workout={workout}
          open={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Assignment Modal */}
      {showAssignment && (
        <WorkoutAssignment
          workout={workout}
          open={showAssignment}
          onClose={() => setShowAssignment(false)}
          onSuccess={() => {
            setShowAssignment(false)
            resetWorkout()
          }}
        />
      )}
    </div>
  )
}
