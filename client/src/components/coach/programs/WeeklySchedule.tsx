import React, { useState } from 'react'
import { Plus, Clock, Target, Copy, Trash2, Edit } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

interface WeeklyScheduleProps {
  week: number
  workouts: Workout[]
  onAddWorkout: (workout: Omit<Workout, 'week_number'>) => void
  onUpdateWorkout: (workoutId: number, updates: Partial<Workout>) => void
  onRemoveWorkout: (workoutId: number) => void
  onDuplicateWorkout: (workoutId: number, targetWeek?: number) => void
}

const daysOfWeek = [
  { number: 1, name: 'Monday' },
  { number: 2, name: 'Tuesday' },
  { number: 3, name: 'Wednesday' },
  { number: 4, name: 'Thursday' },
  { number: 5, name: 'Friday' },
  { number: 6, name: 'Saturday' },
  { number: 7, name: 'Sunday' }
]

const workoutTypeColors = {
  strength: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  cardio: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  hiit: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  flexibility: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  recovery: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
}

const initialWorkoutData = {
  name: '',
  description: '',
  estimated_duration: 45,
  difficulty_rating: 5,
  workout_type: 'strength' as const,
  day_number: 1,
  exercises: []
}

export default function WeeklySchedule({
  week,
  workouts,
  onAddWorkout,
  onUpdateWorkout,
  onRemoveWorkout,
  onDuplicateWorkout
}: WeeklyScheduleProps) {
  const [showWorkoutDialog, setShowWorkoutDialog] = useState(false)
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null)
  const [workoutData, setWorkoutData] = useState(initialWorkoutData)
  const [selectedDay, setSelectedDay] = useState(1)

  const getWorkoutForDay = (dayNumber: number) => {
    return workouts.find(w => w.day_number === dayNumber)
  }

  const openNewWorkoutDialog = (dayNumber: number) => {
    setWorkoutData({ ...initialWorkoutData, day_number: dayNumber })
    setSelectedDay(dayNumber)
    setEditingWorkout(null)
    setShowWorkoutDialog(true)
  }

  const openEditWorkoutDialog = (workout: Workout) => {
    setWorkoutData({
      name: workout.name,
      description: workout.description,
      estimated_duration: workout.estimated_duration,
      difficulty_rating: workout.difficulty_rating,
      workout_type: workout.workout_type,
      day_number: workout.day_number,
      exercises: workout.exercises
    })
    setEditingWorkout(workout)
    setShowWorkoutDialog(true)
  }

  const handleSaveWorkout = () => {
    if (!workoutData.name.trim()) return

    if (editingWorkout) {
      onUpdateWorkout(editingWorkout.id!, workoutData)
    } else {
      onAddWorkout(workoutData)
    }

    setShowWorkoutDialog(false)
    setWorkoutData(initialWorkoutData)
    setEditingWorkout(null)
  }

  const handleDeleteWorkout = (workout: Workout) => {
    if (workout.id) {
      onRemoveWorkout(workout.id)
    }
  }

  const handleDuplicateWorkout = (workout: Workout) => {
    if (workout.id) {
      onDuplicateWorkout(workout.id)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Week {week} Schedule</h3>
          <div className="text-sm text-muted-foreground">
            {workouts.length} workout{workouts.length !== 1 ? 's' : ''} scheduled
          </div>
        </div>

        {/* Weekly Calendar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {daysOfWeek.map(day => {
            const workout = getWorkoutForDay(day.number)
            
            return (
              <Card
                key={day.number}
                variant={workout ? "premium" : "glass"}
                className={`min-h-32 ${!workout ? 'border-dashed' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="text-center mb-3">
                    <div className="font-medium text-sm">{day.name}</div>
                    <div className="text-xs text-muted-foreground">Day {day.number}</div>
                  </div>

                  {workout ? (
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-medium text-sm truncate" title={workout.name}>
                          {workout.name}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{workout.estimated_duration}min</span>
                        </div>
                      </div>

                      <Badge 
                        className={`${workoutTypeColors[workout.workout_type]} text-xs`}
                        size="sm"
                      >
                        {workout.workout_type}
                      </Badge>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: workout.difficulty_rating }, (_, i) => (
                          <div key={i} className="w-1.5 h-1.5 bg-primary rounded-full" />
                        ))}
                        {Array.from({ length: 10 - workout.difficulty_rating }, (_, i) => (
                          <div key={i} className="w-1.5 h-1.5 bg-muted rounded-full" />
                        ))}
                      </div>

                      <div className="flex gap-1 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => openEditWorkoutDialog(workout)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleDuplicateWorkout(workout)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteWorkout(workout)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openNewWorkoutDialog(day.number)}
                        className="w-full h-16 border-dashed border-2 border-muted-foreground/25 hover:border-primary/50"
                      >
                        <div>
                          <Plus className="w-4 h-4 mx-auto mb-1" />
                          <span className="text-xs">Add Workout</span>
                        </div>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openNewWorkoutDialog(1)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Workout
          </Button>
          
          {workouts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // TODO: Copy entire week to another week
                console.log('Copy week functionality')
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Week
            </Button>
          )}
        </div>
      </div>

      {/* Workout Dialog */}
      <Dialog open={showWorkoutDialog} onOpenChange={setShowWorkoutDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingWorkout ? 'Edit Workout' : 'Add New Workout'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="workout-name">Workout Name *</Label>
                <Input
                  id="workout-name"
                  value={workoutData.name}
                  onChange={(e) => setWorkoutData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Upper Body Strength"
                />
              </div>
              <div>
                <Label htmlFor="day">Day</Label>
                <Select 
                  value={workoutData.day_number.toString()} 
                  onValueChange={(value) => setWorkoutData(prev => ({ ...prev, day_number: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map(day => (
                      <SelectItem key={day.number} value={day.number.toString()}>
                        {day.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={workoutData.description}
                onChange={(e) => setWorkoutData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the workout focus and goals"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  max="180"
                  value={workoutData.estimated_duration}
                  onChange={(e) => setWorkoutData(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) || 45 }))}
                />
              </div>
              <div>
                <Label htmlFor="type">Workout Type</Label>
                <Select 
                  value={workoutData.workout_type} 
                  onValueChange={(value) => setWorkoutData(prev => ({ ...prev, workout_type: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="hiit">HIIT</SelectItem>
                    <SelectItem value="flexibility">Flexibility</SelectItem>
                    <SelectItem value="recovery">Recovery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="difficulty">Difficulty (1-10)</Label>
                <Input
                  id="difficulty"
                  type="number"
                  min="1"
                  max="10"
                  value={workoutData.difficulty_rating}
                  onChange={(e) => setWorkoutData(prev => ({ ...prev, difficulty_rating: parseInt(e.target.value) || 5 }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowWorkoutDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveWorkout}
                disabled={!workoutData.name.trim()}
                className="bg-gradient-to-r from-primary to-accent text-white"
              >
                {editingWorkout ? 'Update' : 'Add'} Workout
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
