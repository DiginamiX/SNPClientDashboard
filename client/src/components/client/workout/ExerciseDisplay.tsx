import React, { useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Target, Info, Clock, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

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

interface ExerciseSet {
  id?: number
  set_number: number
  actual_reps: number
  actual_weight: number
  rpe: number
  notes?: string
}

interface ExerciseDisplayProps {
  exercise: WorkoutExercise
  currentSet: number
  completedSets: ExerciseSet[]
}

const muscleGroupColors = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400'
]

export default function ExerciseDisplay({ exercise, currentSet, completedSets }: ExerciseDisplayProps) {
  const [showVideo, setShowVideo] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  const formatRestTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }

  const getLastSetData = () => {
    if (completedSets.length === 0) return null
    return completedSets[completedSets.length - 1]
  }

  const lastSet = getLastSetData()

  return (
    <div className="p-4 space-y-6">
      {/* Exercise Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">{exercise.exercise.name}</h1>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Badge variant="outline">{exercise.exercise.category}</Badge>
          {exercise.exercise.equipment && (
            <Badge variant="secondary">{exercise.exercise.equipment}</Badge>
          )}
        </div>
      </div>

      {/* Video/Image Display */}
      <Card variant="premium">
        <CardContent className="p-0">
          <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg overflow-hidden">
            {exercise.exercise.video_url ? (
              showVideo ? (
                <video
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  muted={isMuted}
                  poster={exercise.exercise.thumbnail_url}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                >
                  <source src={exercise.exercise.video_url} type="video/mp4" />
                </video>
              ) : (
                <div 
                  className="relative w-full h-full cursor-pointer group"
                  onClick={() => setShowVideo(true)}
                >
                  {exercise.exercise.thumbnail_url ? (
                    <img
                      src={exercise.exercise.thumbnail_url}
                      alt={exercise.exercise.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Target className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/90 rounded-full p-4">
                      <Play className="w-8 h-8 text-black" />
                    </div>
                  </div>
                </div>
              )
            ) : exercise.exercise.thumbnail_url ? (
              <img
                src={exercise.exercise.thumbnail_url}
                alt={exercise.exercise.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Target className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Exercise Prescription */}
      <Card variant="glass">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {exercise.sets}
              </div>
              <div className="text-sm text-muted-foreground">SETS</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {exercise.reps}
              </div>
              <div className="text-sm text-muted-foreground">REPS</div>
            </div>
            {exercise.weight && (
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">
                  {exercise.weight}
                </div>
                <div className="text-sm text-muted-foreground">WEIGHT</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {formatRestTime(exercise.rest_seconds)}
              </div>
              <div className="text-sm text-muted-foreground">REST</div>
            </div>
          </div>

          {/* Additional Info */}
          {(exercise.rpe_target || exercise.tempo) && (
            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {exercise.rpe_target && (
                  <div className="text-center">
                    <div className="font-semibold text-primary">RPE {exercise.rpe_target}/10</div>
                    <div className="text-muted-foreground">Target Intensity</div>
                  </div>
                )}
                {exercise.tempo && (
                  <div className="text-center">
                    <div className="font-semibold text-primary">{exercise.tempo}</div>
                    <div className="text-muted-foreground">Tempo</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Set Progress */}
      <Card variant="premium">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Current Set</h3>
            <Badge variant="outline">
              Set {currentSet} of {exercise.sets}
            </Badge>
          </div>

          {/* Progress Indicators */}
          <div className="flex gap-2 mb-4">
            {Array.from({ length: exercise.sets }, (_, i) => (
              <div
                key={i}
                className={`h-3 flex-1 rounded-full ${
                  i < completedSets.length
                    ? 'bg-green-500'
                    : i === currentSet - 1
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Last Set Performance */}
          {lastSet && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm font-medium mb-2">Last Set Performance:</div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="font-semibold">{lastSet.actual_reps}</div>
                  <div className="text-muted-foreground">reps</div>
                </div>
                <div>
                  <div className="font-semibold">{lastSet.actual_weight} lbs</div>
                  <div className="text-muted-foreground">weight</div>
                </div>
                <div>
                  <div className="font-semibold">RPE {lastSet.rpe}</div>
                  <div className="text-muted-foreground">intensity</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercise Instructions */}
      <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  <span className="font-medium">Exercise Instructions</span>
                </div>
                <div className="text-muted-foreground">
                  {showInstructions ? 'Hide' : 'Show'}
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 mt-4">
            {/* Description */}
            {exercise.exercise.description && (
              <Card variant="glass">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {exercise.exercise.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            {exercise.exercise.instructions && (
              <Card variant="glass">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">How to Perform</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {exercise.exercise.instructions}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Coach Notes */}
            {exercise.notes && (
              <Card variant="premium">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Coach Notes</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {exercise.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Muscle Groups */}
            {exercise.exercise.muscle_groups && exercise.exercise.muscle_groups.length > 0 && (
              <Card variant="glass">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Target Muscles</h4>
                  <div className="flex flex-wrap gap-2">
                    {exercise.exercise.muscle_groups.map((muscle, index) => (
                      <Badge
                        key={muscle}
                        className={muscleGroupColors[index % muscleGroupColors.length]}
                      >
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
