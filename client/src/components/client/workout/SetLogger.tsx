import React, { useState, useEffect } from 'react'
import { Plus, Minus, Check, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface WorkoutExercise {
  id: number
  exercise: {
    id: number
    name: string
    equipment: string
  }
  sets: number
  reps: string
  weight: string
  rest_seconds: number
  notes: string
  rpe_target?: number
}

interface ExerciseSet {
  id?: number
  set_number: number
  actual_reps: number
  actual_weight: number
  rpe: number
  notes?: string
}

interface SetLoggerProps {
  exercise: WorkoutExercise
  setNumber: number
  previousSets: ExerciseSet[]
  onLogSet: (setData: Omit<ExerciseSet, 'id'>) => void
  isResting: boolean
}

const rpeDescriptions = {
  6: 'Light - Could do many more reps',
  7: 'Moderate - Could do 3-4 more reps',
  8: 'Hard - Could do 2-3 more reps',
  9: 'Very Hard - Could do 1-2 more reps',
  10: 'Max - Could not do any more reps'
}

const commonWeights = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
  105, 110, 115, 120, 125, 135, 145, 155, 165, 175, 185, 195, 205, 215, 225, 245, 265, 275, 295, 315
]

export default function SetLogger({ exercise, setNumber, previousSets, onLogSet, isResting }: SetLoggerProps) {
  const [reps, setReps] = useState<number>(0)
  const [weight, setWeight] = useState<number>(0)
  const [rpe, setRpe] = useState<number>(exercise.rpe_target || 7)
  const [notes, setNotes] = useState<string>('')
  const [showWeightPicker, setShowWeightPicker] = useState(false)

  // Initialize with previous set data or prescribed values
  useEffect(() => {
    const lastSet = previousSets[previousSets.length - 1]
    if (lastSet) {
      // Use previous set as starting point
      setReps(lastSet.actual_reps)
      setWeight(lastSet.actual_weight)
      setRpe(lastSet.rpe)
    } else {
      // Parse prescribed values for first set
      const prescribedReps = exercise.reps.includes('-') 
        ? parseInt(exercise.reps.split('-')[0]) 
        : parseInt(exercise.reps) || 0
      
      const prescribedWeight = exercise.weight 
        ? parseFloat(exercise.weight.replace(/[^\d.]/g, '')) || 0
        : 0

      setReps(prescribedReps)
      setWeight(prescribedWeight)
    }
  }, [exercise, previousSets, setNumber])

  const handleLogSet = () => {
    if (reps <= 0) return

    onLogSet({
      set_number: setNumber,
      actual_reps: reps,
      actual_weight: weight,
      rpe,
      notes: notes.trim() || undefined
    })

    // Reset notes for next set
    setNotes('')
  }

  const incrementReps = () => setReps(prev => Math.min(prev + 1, 50))
  const decrementReps = () => setReps(prev => Math.max(prev - 1, 0))
  const incrementWeight = () => setWeight(prev => prev + (prev >= 100 ? 10 : 5))
  const decrementWeight = () => setWeight(prev => Math.max(prev - (prev > 100 ? 10 : 5), 0))

  const getQuickWeights = () => {
    const currentWeight = weight
    return commonWeights
      .filter(w => Math.abs(w - currentWeight) <= 50)
      .sort((a, b) => Math.abs(a - currentWeight) - Math.abs(b - currentWeight))
      .slice(0, 8)
  }

  const isBodyweight = exercise.exercise.equipment === 'bodyweight'
  const canLogSet = reps > 0 && !isResting

  return (
    <div className="p-4 space-y-4">
      {/* Set Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Log Set {setNumber}</h3>
          <p className="text-sm text-muted-foreground">
            Target: {exercise.reps} reps {exercise.weight && `@ ${exercise.weight}`}
          </p>
        </div>
        {exercise.rpe_target && (
          <Badge variant="outline">
            Target RPE {exercise.rpe_target}
          </Badge>
        )}
      </div>

      {/* Reps Input */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-sm font-medium mb-3 block">Reps Completed</Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 touch-manipulation"
              onClick={decrementReps}
              disabled={reps <= 0}
            >
              <Minus className="w-5 h-5" />
            </Button>
            
            <div className="flex-1 relative">
              <Input
                type="number"
                value={reps || ''}
                onChange={(e) => setReps(parseInt(e.target.value) || 0)}
                className="text-center text-xl font-bold h-12"
                min="0"
                max="50"
              />
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 touch-manipulation"
              onClick={incrementReps}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weight Input */}
      {!isBodyweight && (
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm font-medium mb-3 block">Weight (lbs)</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 touch-manipulation"
                  onClick={decrementWeight}
                  disabled={weight <= 0}
                >
                  <Minus className="w-5 h-5" />
                </Button>
                
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    value={weight || ''}
                    onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                    className="text-center text-xl font-bold h-12"
                    min="0"
                    step="2.5"
                  />
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 touch-manipulation"
                  onClick={incrementWeight}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>

              {/* Quick Weight Selection */}
              <div className="grid grid-cols-4 gap-2">
                {getQuickWeights().map(quickWeight => (
                  <Button
                    key={quickWeight}
                    variant={weight === quickWeight ? "default" : "outline"}
                    size="sm"
                    className="h-10 text-sm touch-manipulation"
                    onClick={() => setWeight(quickWeight)}
                  >
                    {quickWeight}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RPE Selection */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-sm font-medium mb-3 block">
            Rate of Perceived Exertion (RPE)
          </Label>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {[6, 7, 8, 9, 10].map(rpeValue => (
              <Button
                key={rpeValue}
                variant={rpe === rpeValue ? "default" : "outline"}
                className="h-12 text-lg font-bold touch-manipulation"
                onClick={() => setRpe(rpeValue)}
              >
                {rpeValue}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {rpeDescriptions[rpe as keyof typeof rpeDescriptions]}
          </p>
        </CardContent>
      </Card>

      {/* Notes (Optional) */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-sm font-medium mb-3 block">
            Notes (Optional)
          </Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did this set feel?"
            className="h-12"
          />
        </CardContent>
      </Card>

      {/* Previous Set Reference */}
      {previousSets.length > 0 && (
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="text-sm">
              <div className="font-medium mb-2">Previous Set:</div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>{previousSets[previousSets.length - 1].actual_reps} reps</span>
                {!isBodyweight && (
                  <span>{previousSets[previousSets.length - 1].actual_weight} lbs</span>
                )}
                <span>RPE {previousSets[previousSets.length - 1].rpe}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Set Button */}
      <Button
        onClick={handleLogSet}
        disabled={!canLogSet}
        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-accent text-white disabled:opacity-50 touch-manipulation"
      >
        {isResting ? (
          <>
            <RotateCcw className="w-5 h-5 mr-2 animate-spin" />
            Resting...
          </>
        ) : (
          <>
            <Check className="w-5 h-5 mr-2" />
            Complete Set {setNumber}
          </>
        )}
      </Button>

      {/* Helper Text */}
      <div className="text-center text-sm text-muted-foreground">
        {isResting ? (
          'Rest timer is active. Complete your rest before logging the next set.'
        ) : (
          'Log your completed reps, weight, and effort level'
        )}
      </div>
    </div>
  )
}
