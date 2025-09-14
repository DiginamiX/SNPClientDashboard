import React, { useState, useEffect } from 'react'
import { Plus, Calendar, Copy, Save, Eye, Users, Clock, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/ui/loading'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase'
import WeeklySchedule from './WeeklySchedule'
import ProgramPreview from './ProgramPreview'
import ProgramAssignment from './ProgramAssignment'

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

interface ProgramData {
  name: string
  description: string
  duration_weeks: number
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  program_type: 'strength' | 'cardio' | 'hybrid' | 'flexibility' | 'sports_specific'
  target_goals: string[]
  estimated_hours_per_week: number
  is_template: boolean
  is_public: boolean
  tags: string[]
}

const initialProgramData: ProgramData = {
  name: '',
  description: '',
  duration_weeks: 4,
  difficulty_level: 'beginner',
  program_type: 'strength',
  target_goals: [],
  estimated_hours_per_week: 3,
  is_template: false,
  is_public: false,
  tags: []
}

const goalOptions = [
  'weight_loss', 'muscle_gain', 'strength', 'endurance', 'flexibility', 
  'athletic_performance', 'general_fitness', 'rehabilitation'
]

export default function ProgramBuilder() {
  const [programData, setProgramData] = useState<ProgramData>(initialProgramData)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [showPreview, setShowPreview] = useState(false)
  const [showAssignment, setShowAssignment] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedProgramId, setSavedProgramId] = useState<number | null>(null)

  const { user } = useSupabaseAuth()

  const updateProgramData = (field: keyof ProgramData, value: any) => {
    setProgramData(prev => ({ ...prev, [field]: value }))
  }

  const addGoal = (goal: string) => {
    if (!programData.target_goals.includes(goal)) {
      updateProgramData('target_goals', [...programData.target_goals, goal])
    }
  }

  const removeGoal = (goal: string) => {
    updateProgramData('target_goals', programData.target_goals.filter(g => g !== goal))
  }

  const addTag = (tag: string) => {
    if (tag && !programData.tags.includes(tag)) {
      updateProgramData('tags', [...programData.tags, tag])
    }
  }

  const removeTag = (tag: string) => {
    updateProgramData('tags', programData.tags.filter(t => t !== tag))
  }

  const addWorkoutToWeek = (week: number, workout: Omit<Workout, 'week_number'>) => {
    const newWorkout: Workout = {
      ...workout,
      week_number: week,
      id: Date.now() // Temporary ID
    }
    setWorkouts(prev => [...prev, newWorkout])
  }

  const updateWorkout = (workoutId: number, updates: Partial<Workout>) => {
    setWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, ...updates } : w))
  }

  const removeWorkout = (workoutId: number) => {
    setWorkouts(prev => prev.filter(w => w.id !== workoutId))
  }

  const duplicateWorkout = (workoutId: number, targetWeek?: number) => {
    const workout = workouts.find(w => w.id === workoutId)
    if (workout) {
      const duplicated: Workout = {
        ...workout,
        id: Date.now(),
        week_number: targetWeek || workout.week_number,
        name: `${workout.name} (Copy)`
      }
      setWorkouts(prev => [...prev, duplicated])
    }
  }

  const saveProgram = async () => {
    if (!user || !programData.name.trim()) return

    setSaving(true)
    try {
      console.log('💾 Saving program:', programData.name)
      
      // Create program using API endpoint
      const response = await fetch('/api/programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          name: programData.name,
          description: programData.description,
          durationWeeks: programData.duration_weeks,
          difficultyLevel: programData.difficulty_level,
          programType: programData.program_type,
          isTemplate: programData.is_template,
          isPublic: programData.is_public,
          tags: programData.tags,
          estimatedHoursPerWeek: programData.estimated_hours_per_week,
          targetGoals: programData.target_goals
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create program')
      }

      const program = await response.json()
      console.log('✅ Program created:', program.id)

      // Create workouts using API endpoint
      for (const workout of workouts) {
        const workoutResponse = await fetch('/api/workouts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            workout: {
              programId: program.id,
              name: workout.name,
              description: workout.description,
              dayNumber: workout.day_number,
              weekNumber: workout.week_number,
              estimatedDuration: workout.estimated_duration,
              difficultyRating: workout.difficulty_rating,
              workoutType: workout.workout_type
            },
            exercises: [] // No exercises for now
          })
        })

        if (!workoutResponse.ok) {
          const errorData = await workoutResponse.json()
          throw new Error(errorData.message || 'Failed to create workout')
        }
      }

      console.log('✅ All workouts created successfully')
      setSavedProgramId(program.id)
      setShowAssignment(true)

    } catch (error) {
      console.error('❌ Error saving program:', error)
      alert(`Failed to save program: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const saveAsTemplate = async () => {
    await saveProgram()
    updateProgramData('is_template', true)
  }

  const getWeekWorkouts = (week: number) => {
    return workouts.filter(w => w.week_number === week)
  }

  const getTotalWorkouts = () => workouts.length
  const getAverageWorkoutsPerWeek = () => Math.round(workouts.length / programData.duration_weeks * 10) / 10

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-gradient-orange">Program Builder</h2>
          <p className="text-muted-foreground">
            Create comprehensive multi-week training programs
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
            disabled={!programData.name || workouts.length === 0}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={saveProgram}
            disabled={!programData.name || workouts.length === 0 || saving}
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
                Save Program
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Program Overview */}
      <Card variant="premium">
        <CardHeader>
          <CardTitle>Program Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="program-name">Program Name *</Label>
              <Input
                id="program-name"
                value={programData.name}
                onChange={(e) => updateProgramData('name', e.target.value)}
                placeholder="e.g., 12-Week Strength Building"
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (weeks)</Label>
              <Select 
                value={programData.duration_weeks.toString()} 
                onValueChange={(value) => updateProgramData('duration_weeks', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => i + 1).map(week => (
                    <SelectItem key={week} value={week.toString()}>
                      {week} week{week !== 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={programData.description}
              onChange={(e) => updateProgramData('description', e.target.value)}
              placeholder="Describe the program goals, methodology, and expected outcomes"
              rows={3}
            />
          </div>

          {/* Program Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Difficulty Level</Label>
              <Select 
                value={programData.difficulty_level} 
                onValueChange={(value) => updateProgramData('difficulty_level', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Program Type</Label>
              <Select 
                value={programData.program_type} 
                onValueChange={(value) => updateProgramData('program_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="flexibility">Flexibility</SelectItem>
                  <SelectItem value="sports_specific">Sports Specific</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hours per week</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={programData.estimated_hours_per_week}
                onChange={(e) => updateProgramData('estimated_hours_per_week', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Goals */}
          <div>
            <Label>Target Goals</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {goalOptions.map(goal => (
                <Button
                  key={goal}
                  variant={programData.target_goals.includes(goal) ? "default" : "outline"}
                  size="sm"
                  onClick={() => 
                    programData.target_goals.includes(goal) 
                      ? removeGoal(goal) 
                      : addGoal(goal)
                  }
                  className="text-xs"
                >
                  {goal.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>

          {/* Program Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{getTotalWorkouts()}</div>
              <div className="text-sm text-muted-foreground">Total Workouts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{getAverageWorkoutsPerWeek()}</div>
              <div className="text-sm text-muted-foreground">Workouts/Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{programData.estimated_hours_per_week}</div>
              <div className="text-sm text-muted-foreground">Hours/Week</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <Card variant="premium">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Weekly Schedule
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label>Week:</Label>
              <Select 
                value={selectedWeek.toString()} 
                onValueChange={(value) => setSelectedWeek(parseInt(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: programData.duration_weeks }, (_, i) => i + 1).map(week => (
                    <SelectItem key={week} value={week.toString()}>
                      {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <WeeklySchedule
            week={selectedWeek}
            workouts={getWeekWorkouts(selectedWeek)}
            onAddWorkout={(workout) => addWorkoutToWeek(selectedWeek, workout)}
            onUpdateWorkout={updateWorkout}
            onRemoveWorkout={removeWorkout}
            onDuplicateWorkout={duplicateWorkout}
          />
        </CardContent>
      </Card>

      {/* Program Preview Modal */}
      {showPreview && (
        <ProgramPreview
          program={programData}
          workouts={workouts}
          open={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Program Assignment Modal */}
      {showAssignment && savedProgramId && (
        <ProgramAssignment
          programId={savedProgramId}
          open={showAssignment}
          onClose={() => setShowAssignment(false)}
          onSuccess={() => {
            setShowAssignment(false)
            // Reset form or navigate
          }}
        />
      )}
    </div>
  )
}
