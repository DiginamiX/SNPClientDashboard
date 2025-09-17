import React, { useState } from 'react'
import { X, Play, Pause, Volume2, VolumeX, Maximize, Target, Clock, Zap, User } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Exercise } from '@shared/schema'

interface ExercisePreviewProps {
  exercise: Exercise
  open: boolean
  onClose: () => void
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
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
]

export default function ExercisePreview({ exercise, open, onClose }: ExercisePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showFullInstructions, setShowFullInstructions] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl font-display text-gradient-orange">
                  {exercise.name}
                </DialogTitle>
                {exercise.categoryId && (
                  <p className="text-muted-foreground mt-1">
                    {exercise.categoryId}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Video/Image Section */}
              <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg overflow-hidden">
                {exercise.videoUrl ? (
                  <div className="relative w-full h-full">
                    <video
                      className="w-full h-full object-cover"
                      poster={exercise.thumbnailUrl || undefined}
                      controls
                      muted={isMuted}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    >
                      <source src={exercise.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : exercise.thumbnailUrl ? (
                  <img
                    src={exercise.thumbnailUrl || ''}
                    alt={exercise.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Target className="w-24 h-24 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Exercise Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Difficulty */}
                <Card variant="glass">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Target className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold mb-1">Difficulty</h4>
                    <Badge className={difficultyColors[exercise.difficultyLevel || 'beginner']}>
                      {exercise.difficultyLevel}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Equipment */}
                <Card variant="glass">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Target className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold mb-1">Equipment</h4>
                    <p className="text-sm text-muted-foreground capitalize">
                      {exercise.equipment || 'None'}
                    </p>
                  </CardContent>
                </Card>

                {/* Calories */}
                {exercise.caloriesPerMinute && (
                  <Card variant="glass">
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Zap className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <h4 className="font-semibold mb-1">Calories</h4>
                      <p className="text-sm text-muted-foreground">
                        {exercise.caloriesPerMinute}/min
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Description */}
              {exercise.description && (
                <Card variant="premium">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {exercise.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Instructions */}
              {exercise.instructions && (
                <Card variant="premium">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Instructions</h4>
                      {exercise.instructions.length > 200 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowFullInstructions(!showFullInstructions)}
                        >
                          {showFullInstructions ? 'Show Less' : 'Show More'}
                        </Button>
                      )}
                    </div>
                    <div className="text-muted-foreground leading-relaxed">
                      {showFullInstructions || exercise.instructions.length <= 200 ? (
                        <p>{exercise.instructions}</p>
                      ) : (
                        <p>{exercise.instructions.substring(0, 200)}...</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Muscle Groups */}
              {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                <Card variant="premium">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Target Muscle Groups</h4>
                    <div className="flex flex-wrap gap-2">
                      {exercise.muscleGroups.map((muscle, index) => (
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

              {/* Tags */}
              {exercise.tags && exercise.tags.length > 0 && (
                <Card variant="glass">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {exercise.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Exercise Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>
                    {exercise.isPublic ? 'Public Exercise' : 'Private Exercise'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    Created {formatDate(exercise.createdAt || new Date().toISOString())}
                  </span>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Exercise ID: {exercise.id}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button 
                  className="bg-gradient-to-r from-primary to-accent text-white"
                  onClick={() => {
                    // TODO: Add to workout functionality
                    console.log('Add to workout:', exercise.id)
                  }}
                >
                  Add to Workout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
