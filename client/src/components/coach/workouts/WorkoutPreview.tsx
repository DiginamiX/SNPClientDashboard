import React from 'react'
import { X, Timer, Target, Zap, Play } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

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
  id: string
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

interface WorkoutPreviewProps {
  workout: WorkoutBuilderState
  open: boolean
  onClose: () => void
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
}

const workoutTypeColors = {
  strength: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  cardio: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  hiit: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  flexibility: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  recovery: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
}

export default function WorkoutPreview({ workout, open, onClose }: WorkoutPreviewProps) {
  const formatRestTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }

  const calculateTotalDuration = () => {
    return workout.exercises.reduce((total, ex) => {
      const exerciseTime = ex.sets * 30 // 30 seconds per set estimate
      const restTime = ex.sets * ex.rest_seconds
      return total + exerciseTime + restTime
    }, 0) / 60 // Convert to minutes
  }

  const totalSets = workout.exercises.reduce((total, ex) => total + ex.sets, 0)
  const uniqueMuscleGroups = [...new Set(workout.exercises.flatMap(ex => ex.exercise.muscle_groups || []))]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl font-display text-gradient-orange mb-2">
                  {workout.name || 'Untitled Workout'}
                </DialogTitle>
                <div className="flex items-center gap-3">
                  <Badge className={workoutTypeColors[workout.workout_type]}>
                    {workout.workout_type}
                  </Badge>
                  <Badge className={difficultyColors[workout.difficulty_level]}>
                    {workout.difficulty_level}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    {workout.exercises.length} exercises • {totalSets} sets • {Math.round(calculateTotalDuration())} min
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Workout Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card variant="glass">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Timer className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold mb-1">Duration</h4>
                    <p className="text-2xl font-bold text-primary">
                      {Math.round(calculateTotalDuration())}
                    </p>
                    <p className="text-sm text-muted-foreground">minutes</p>
                  </CardContent>
                </Card>

                <Card variant="glass">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Target className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold mb-1">Total Sets</h4>
                    <p className="text-2xl font-bold text-primary">{totalSets}</p>
                    <p className="text-sm text-muted-foreground">sets</p>
                  </CardContent>
                </Card>

                <Card variant="glass">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Zap className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold mb-1">Muscle Groups</h4>
                    <p className="text-2xl font-bold text-primary">{uniqueMuscleGroups.length}</p>
                    <p className="text-sm text-muted-foreground">targeted</p>
                  </CardContent>
                </Card>
              </div>

              {/* Workout Description */}
              {workout.description && (
                <Card variant="premium">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {workout.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Workout Instructions */}
              {workout.instructions && (
                <Card variant="premium">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Instructions</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {workout.instructions}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Target Muscle Groups */}
              {uniqueMuscleGroups.length > 0 && (
                <Card variant="glass">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Target Muscle Groups</h4>
                    <div className="flex flex-wrap gap-2">
                      {uniqueMuscleGroups.map(muscle => (
                        <Badge key={muscle} variant="secondary">
                          {muscle}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Exercise List */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Exercise Breakdown</h3>
                {workout.exercises.map((workoutExercise, index) => (
                  <Card key={workoutExercise.id} variant="premium">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Exercise Number */}
                        <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full text-primary font-semibold text-lg flex-shrink-0">
                          {index + 1}
                        </div>

                        {/* Exercise Image/Video */}
                        <div className="flex-shrink-0">
                          {workoutExercise.exercise.thumbnail_url || workoutExercise.exercise.video_url ? (
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted relative">
                              <img
                                src={workoutExercise.exercise.thumbnail_url || workoutExercise.exercise.video_url}
                                alt={workoutExercise.exercise.name}
                                className="w-full h-full object-cover"
                              />
                              {workoutExercise.exercise.video_url && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/50 transition-opacity">
                                  <Play className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                              <Target className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Exercise Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-lg mb-1">
                                {workoutExercise.exercise.name}
                              </h4>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {workoutExercise.exercise.category}
                                </Badge>
                                <Badge className={difficultyColors[workoutExercise.exercise.difficulty_level]}>
                                  {workoutExercise.exercise.difficulty_level}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Exercise Prescription */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">SETS</p>
                              <p className="text-lg font-semibold">{workoutExercise.sets}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">REPS</p>
                              <p className="text-lg font-semibold">{workoutExercise.reps}</p>
                            </div>
                            {workoutExercise.weight && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">WEIGHT</p>
                                <p className="text-lg font-semibold">{workoutExercise.weight}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">REST</p>
                              <p className="text-lg font-semibold">{formatRestTime(workoutExercise.rest_seconds)}</p>
                            </div>
                          </div>

                          {/* Additional Info */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                            {workoutExercise.rpe_target && (
                              <span>RPE: {workoutExercise.rpe_target}/10</span>
                            )}
                            {workoutExercise.tempo && (
                              <span>Tempo: {workoutExercise.tempo}</span>
                            )}
                            {workoutExercise.exercise.equipment && (
                              <span>Equipment: {workoutExercise.exercise.equipment}</span>
                            )}
                          </div>

                          {/* Exercise Notes */}
                          {workoutExercise.notes && (
                            <div className="bg-muted/50 rounded-lg p-3 mb-3">
                              <p className="text-sm font-medium mb-1">Coaching Notes:</p>
                              <p className="text-sm text-muted-foreground">{workoutExercise.notes}</p>
                            </div>
                          )}

                          {/* Muscle Groups */}
                          {workoutExercise.exercise.muscle_groups && workoutExercise.exercise.muscle_groups.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {workoutExercise.exercise.muscle_groups.map(muscle => (
                                <Badge key={muscle} variant="secondary" className="text-xs">
                                  {muscle}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                This is how your clients will see the workout
              </div>
              <Button onClick={onClose}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
