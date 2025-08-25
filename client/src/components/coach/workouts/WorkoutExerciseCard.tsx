import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Play, Copy, Trash2, Timer, Target, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

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

interface WorkoutExerciseCardProps {
  workoutExercise: WorkoutExercise
  index: number
  onUpdate: (updates: Partial<WorkoutExercise>) => void
  onRemove: () => void
  onDuplicate: () => void
}

const restTimeOptions = [
  { value: 30, label: '30 sec' },
  { value: 45, label: '45 sec' },
  { value: 60, label: '1 min' },
  { value: 90, label: '1.5 min' },
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
  { value: 240, label: '4 min' },
  { value: 300, label: '5 min' }
]

const rpeOptions = [
  { value: 6, label: '6 - Light', description: 'Could do many more reps' },
  { value: 7, label: '7 - Moderate', description: 'Could do 3-4 more reps' },
  { value: 8, label: '8 - Hard', description: 'Could do 2-3 more reps' },
  { value: 9, label: '9 - Very Hard', description: 'Could do 1-2 more reps' },
  { value: 10, label: '10 - Max', description: 'Could not do any more reps' }
]

export default function WorkoutExerciseCard({ 
  workoutExercise, 
  index, 
  onUpdate, 
  onRemove, 
  onDuplicate 
}: WorkoutExerciseCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showVideo, setShowVideo] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: workoutExercise.id,
    data: {
      type: 'workout-exercise',
      workoutExercise
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const { exercise } = workoutExercise

  const formatRestTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-all duration-200',
        isDragging ? 'opacity-50 shadow-2xl rotate-2 scale-105' : 'hover:shadow-md',
        'border-l-4 border-l-primary/50'
      )}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-4 p-4">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Exercise Index */}
          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-primary font-semibold text-sm">
            {index}
          </div>

          {/* Exercise Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-semibold text-lg truncate">{exercise.name}</h3>
              <Badge variant="outline" className="text-xs">
                {exercise.category}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{workoutExercise.sets} sets × {workoutExercise.reps} reps</span>
              {workoutExercise.weight && (
                <>
                  <span>•</span>
                  <span>{workoutExercise.weight}</span>
                </>
              )}
              <span>•</span>
              <span>{formatRestTime(workoutExercise.rest_seconds)} rest</span>
            </div>
          </div>

          {/* Exercise Thumbnail/Video */}
          <div className="relative">
            {exercise.thumbnail_url || exercise.video_url ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                <img
                  src={exercise.thumbnail_url || exercise.video_url}
                  alt={exercise.name}
                  className="w-full h-full object-cover"
                />
                {exercise.video_url && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute inset-0 w-full h-full bg-black/50 hover:bg-black/70 text-white opacity-0 hover:opacity-100 transition-opacity"
                    onClick={() => setShowVideo(true)}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                <Target className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onDuplicate}
              className="h-8 w-8"
              title="Duplicate exercise"
            >
              <Copy className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              title="Remove exercise"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Expanded Configuration */}
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleContent>
            <div className="border-t bg-muted/30 p-4 space-y-4">
              {/* Exercise Configuration Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor={`sets-${workoutExercise.id}`} className="text-xs font-medium">
                    Sets
                  </Label>
                  <div className="flex items-center gap-1 mt-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onUpdate({ sets: Math.max(1, workoutExercise.sets - 1) })}
                    >
                      -
                    </Button>
                    <Input
                      id={`sets-${workoutExercise.id}`}
                      type="number"
                      min="1"
                      max="10"
                      value={workoutExercise.sets}
                      onChange={(e) => onUpdate({ sets: parseInt(e.target.value) || 1 })}
                      className="h-8 text-center"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onUpdate({ sets: Math.min(10, workoutExercise.sets + 1) })}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor={`reps-${workoutExercise.id}`} className="text-xs font-medium">
                    Reps
                  </Label>
                  <Input
                    id={`reps-${workoutExercise.id}`}
                    value={workoutExercise.reps}
                    onChange={(e) => onUpdate({ reps: e.target.value })}
                    placeholder="e.g., 8-12"
                    className="h-8 mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor={`weight-${workoutExercise.id}`} className="text-xs font-medium">
                    Weight
                  </Label>
                  <Input
                    id={`weight-${workoutExercise.id}`}
                    value={workoutExercise.weight}
                    onChange={(e) => onUpdate({ weight: e.target.value })}
                    placeholder="e.g., 135 lbs"
                    className="h-8 mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium">Rest Time</Label>
                  <Select 
                    value={workoutExercise.rest_seconds.toString()} 
                    onValueChange={(value) => onUpdate({ rest_seconds: parseInt(value) })}
                  >
                    <SelectTrigger className="h-8 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {restTimeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advanced Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium">RPE Target</Label>
                  <Select 
                    value={workoutExercise.rpe_target?.toString() || ''} 
                    onValueChange={(value) => onUpdate({ rpe_target: value ? parseInt(value) : undefined })}
                  >
                    <SelectTrigger className="h-8 mt-1">
                      <SelectValue placeholder="Select RPE" />
                    </SelectTrigger>
                    <SelectContent>
                      {rpeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          <div>
                            <div>{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`tempo-${workoutExercise.id}`} className="text-xs font-medium">
                    Tempo
                  </Label>
                  <Input
                    id={`tempo-${workoutExercise.id}`}
                    value={workoutExercise.tempo || ''}
                    onChange={(e) => onUpdate({ tempo: e.target.value })}
                    placeholder="e.g., 3-1-1-1"
                    className="h-8 mt-1"
                  />
                </div>
              </div>

              {/* Exercise Notes */}
              <div>
                <Label htmlFor={`notes-${workoutExercise.id}`} className="text-xs font-medium">
                  Exercise Notes
                </Label>
                <Textarea
                  id={`notes-${workoutExercise.id}`}
                  value={workoutExercise.notes}
                  onChange={(e) => onUpdate({ notes: e.target.value })}
                  placeholder="Coaching cues, form notes, or specific instructions for this exercise..."
                  rows={2}
                  className="mt-1 text-sm"
                />
              </div>

              {/* Exercise Details */}
              {exercise.instructions && (
                <div>
                  <Label className="text-xs font-medium">Instructions</Label>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {exercise.instructions}
                  </p>
                </div>
              )}

              {/* Muscle Groups */}
              {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
                <div>
                  <Label className="text-xs font-medium">Target Muscles</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {exercise.muscle_groups.map(muscle => (
                      <Badge key={muscle} variant="secondary" className="text-xs">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      {/* Video Modal */}
      {showVideo && exercise.video_url && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setShowVideo(false)}
        >
          <div className="max-w-4xl max-h-[80vh] aspect-video">
            <video
              src={exercise.video_url}
              controls
              autoPlay
              className="w-full h-full rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </Card>
  )
}
