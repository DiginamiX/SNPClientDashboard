import React, { useState } from 'react'
import { Play, Eye, Edit, Trash2, Clock, Zap, Target, MoreVertical } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

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
  created_by: string
  is_public: boolean
  tags: string[]
  category: string
  calories_per_minute?: number
  created_at: string
  updated_at: string
}

interface ExerciseCardProps {
  exercise: Exercise
  onPreview: () => void
  onUpdate: (exercise: Exercise) => void
  onDelete: (exerciseId: number) => void
  showActions?: boolean
  isDraggable?: boolean
  onDragStart?: (exercise: Exercise) => void
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
}

const muscleGroupColors = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400'
]

export default function ExerciseCard({
  exercise,
  onPreview,
  onUpdate,
  onDelete,
  showActions = false,
  isDraggable = false,
  onDragStart
}: ExerciseCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(exercise.id)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(exercise)
    }
    // Set drag data for external drop zones
    e.dataTransfer.setData('application/json', JSON.stringify(exercise))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <>
      <Card
        variant="premium"
        className={`group hover:shadow-lg transition-all duration-300 ${
          isDraggable ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        draggable={isDraggable}
        onDragStart={handleDragStart}
      >
        {/* Video/Thumbnail Header */}
        <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-accent/10 rounded-t-lg overflow-hidden">
          {exercise.thumbnail_url || exercise.video_url ? (
            <img
              src={exercise.thumbnail_url || exercise.video_url}
              alt={exercise.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Target className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          
          {/* Video Play Button */}
          {exercise.video_url && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
              <Button
                size="icon"
                className="rounded-full bg-white/90 hover:bg-white text-black"
                onClick={onPreview}
              >
                <Play className="w-5 h-5" />
              </Button>
            </div>
          )}

          {/* Difficulty Badge */}
          <div className="absolute top-2 left-2">
            <Badge className={difficultyColors[exercise.difficulty_level]}>
              {exercise.difficulty_level}
            </Badge>
          </div>

          {/* Actions Menu */}
          {showActions && (
            <div className="absolute top-2 right-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 bg-white/90 hover:bg-white text-black opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onPreview}>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {/* TODO: Implement edit */}}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          {/* Exercise Name and Category */}
          <div className="mb-3">
            <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
              {exercise.name}
            </h3>
            {exercise.category && (
              <p className="text-sm text-muted-foreground">
                {exercise.category}
              </p>
            )}
          </div>

          {/* Description */}
          {exercise.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {exercise.description}
            </p>
          )}

          {/* Muscle Groups */}
          {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {exercise.muscle_groups.slice(0, 3).map((muscle, index) => (
                <Badge
                  key={muscle}
                  variant="secondary"
                  className={muscleGroupColors[index % muscleGroupColors.length]}
                >
                  {muscle}
                </Badge>
              ))}
              {exercise.muscle_groups.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{exercise.muscle_groups.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Equipment and Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              {exercise.equipment && (
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  <span className="capitalize">{exercise.equipment}</span>
                </div>
              )}
              {exercise.calories_per_minute && (
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  <span>{exercise.calories_per_minute}/min</span>
                </div>
              )}
            </div>

            {/* Public/Private Indicator */}
            {!exercise.is_public && showActions && (
              <Badge variant="outline" className="text-xs">
                Private
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onPreview}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            {isDraggable && (
              <Button
                variant="outline"
                size="sm"
                className="px-3"
                title="Drag to add to workout"
              >
                <MoreVertical className="w-4 h-4 rotate-90" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exercise</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{exercise.name}"? This action cannot be undone.
              {exercise.is_public && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  This is a public exercise that may be used by other coaches.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
