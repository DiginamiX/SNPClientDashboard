import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Plus, Target, Dumbbell } from 'lucide-react'
import { Card } from '@/components/ui/card'
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

interface ExerciseDropZoneProps {
  onExerciseDrop: (exercise: Exercise) => void
  className?: string
  compact?: boolean
}

export default function ExerciseDropZone({ onExerciseDrop, className, compact = false }: ExerciseDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'workout-dropzone',
    data: {
      type: 'workout-dropzone'
    }
  })

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'border-2 border-dashed transition-all duration-200',
        isOver 
          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20' 
          : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        compact ? 'hover:bg-muted/30' : '',
        className
      )}
    >
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        {compact ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">
              {isOver ? 'Drop exercise here' : 'Drag exercises here to add more'}
            </span>
          </div>
        ) : (
          <>
            <div className="relative mb-6">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300',
                isOver 
                  ? 'bg-primary/20 scale-110' 
                  : 'bg-muted/50'
              )}>
                {isOver ? (
                  <Target className={cn(
                    'w-8 h-8 transition-colors duration-300',
                    'text-primary'
                  )} />
                ) : (
                  <Dumbbell className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              
              {isOver && (
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              )}
            </div>

            <h3 className={cn(
              'text-xl font-semibold mb-2 transition-colors duration-300',
              isOver ? 'text-primary' : 'text-foreground'
            )}>
              {isOver ? 'Drop Exercise Here' : 'Start Building Your Workout'}
            </h3>
            
            <p className="text-muted-foreground max-w-md leading-relaxed">
              {isOver 
                ? 'Release to add this exercise to your workout'
                : 'Drag exercises from the library on the left to start building your workout program'
              }
            </p>

            {!isOver && (
              <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">1</span>
                  </div>
                  <span>Search exercises</span>
                </div>
                <div className="w-2 h-px bg-muted-foreground/25"></div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">2</span>
                  </div>
                  <span>Drag to workout</span>
                </div>
                <div className="w-2 h-px bg-muted-foreground/25"></div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">3</span>
                  </div>
                  <span>Configure sets/reps</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}
