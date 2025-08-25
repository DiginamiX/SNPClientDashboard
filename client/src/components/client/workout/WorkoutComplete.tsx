import React, { useState } from 'react'
import { CheckCircle, Trophy, Clock, Target, Zap, Star, MessageSquare, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase'

interface WorkoutSession {
  id: number
  workout_id: number
  start_time: string
  end_time?: string
  total_duration?: number
  exercises_completed: number
  total_exercises: number
}

interface ExerciseSet {
  id?: number
  set_number: number
  actual_reps: number
  actual_weight: number
  rpe: number
  notes?: string
}

interface WorkoutCompleteProps {
  workout: any
  workoutSession: WorkoutSession
  completedSets: Record<string, ExerciseSet[]>
  onExit: () => void
}

const motivationalMessages = [
  "Outstanding work! You crushed that workout! 💪",
  "Another step closer to your goals! Keep it up! 🚀",
  "You showed up and got it done! That's what champions do! 🏆",
  "Every rep counts, and you nailed every one! Amazing! ⭐",
  "Your dedication is inspiring! Great job today! 🔥"
]

export default function WorkoutComplete({ 
  workout, 
  workoutSession, 
  completedSets, 
  onExit 
}: WorkoutCompleteProps) {
  const [feedback, setFeedback] = useState('')
  const [workoutRating, setWorkoutRating] = useState(0)
  const [difficulty, setDifficulty] = useState(0)
  const [energy, setEnergy] = useState(0)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  const { user } = useSupabaseAuth()

  const motivationalMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]

  // Calculate workout stats
  const totalSets = Object.values(completedSets).reduce((total, sets) => total + sets.length, 0)
  const totalReps = Object.values(completedSets).reduce((total, sets) => 
    total + sets.reduce((setTotal, set) => setTotal + set.actual_reps, 0), 0
  )
  const averageRPE = Object.values(completedSets).reduce((total, sets) => {
    const setsTotal = sets.reduce((setTotal, set) => setTotal + set.rpe, 0)
    return total + setsTotal
  }, 0) / totalSets || 0

  const totalWeight = Object.values(completedSets).reduce((total, sets) => 
    total + sets.reduce((setTotal, set) => setTotal + (set.actual_weight * set.actual_reps), 0), 0
  )

  const duration = workoutSession.total_duration || 
    Math.round((new Date().getTime() - new Date(workoutSession.start_time).getTime()) / (1000 * 60))

  const submitFeedback = async () => {
    if (!user || feedbackSubmitted) return

    setSubmittingFeedback(true)
    try {
      await supabase
        .from('workout_feedback')
        .insert({
          workout_session_id: workoutSession.id,
          client_id: user.id,
          overall_difficulty: difficulty,
          energy_level: energy,
          workout_enjoyment: workoutRating,
          feedback_text: feedback.trim() || null
        })

      // Update workout session with ratings
      await supabase
        .from('workout_sessions')
        .update({
          workout_rating: workoutRating,
          difficulty_rating: difficulty,
          energy_level: energy,
          client_notes: feedback.trim() || null
        })
        .eq('id', workoutSession.id)

      setFeedbackSubmitted(true)
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const StarRating = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: number
    onChange: (value: number) => void
    label: string 
  }) => (
    <div className="text-center">
      <Label className="text-sm font-medium mb-2 block">{label}</Label>
      <div className="flex justify-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className={`w-8 h-8 touch-manipulation ${
              star <= value ? 'text-yellow-400' : 'text-muted-foreground'
            } hover:text-yellow-400 transition-colors`}
          >
            <Star className="w-full h-full" fill={star <= value ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        {value === 0 ? 'Tap to rate' : `${value}/5`}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Celebration Header */}
        <Card variant="premium" className="text-center border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-8">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
              Workout Complete!
            </h1>
            <p className="text-green-600 dark:text-green-300 font-medium">
              {motivationalMessage}
            </p>
          </CardContent>
        </Card>

        {/* Workout Summary */}
        <Card variant="premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              {workout.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">{duration}</div>
                <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4" />
                  minutes
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">{totalSets}</div>
                <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Target className="w-4 h-4" />
                  sets
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">{totalReps}</div>
                <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Zap className="w-4 h-4" />
                  reps
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">
                  {Math.round(averageRPE * 10) / 10}
                </div>
                <div className="text-sm text-muted-foreground">
                  avg RPE
                </div>
              </div>
            </div>

            {totalWeight > 0 && (
              <div className="text-center p-4 bg-muted/50 rounded-lg mb-4">
                <div className="text-3xl font-bold text-primary mb-1">
                  {Math.round(totalWeight).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  total pounds moved
                </div>
              </div>
            )}

            {/* Achievement Badges */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ✅ Workout Complete
              </Badge>
              {duration <= (workout.estimated_duration || 60) && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  ⚡ On Time
                </Badge>
              )}
              {averageRPE >= 8 && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  🔥 High Intensity
                </Badge>
              )}
              {totalSets >= 20 && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  💪 Volume Beast
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feedback Form */}
        {!feedbackSubmitted ? (
          <Card variant="premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                How was your workout?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Rating Grid */}
              <div className="grid grid-cols-3 gap-4">
                <StarRating
                  value={workoutRating}
                  onChange={setWorkoutRating}
                  label="Enjoyment"
                />
                <StarRating
                  value={difficulty}
                  onChange={setDifficulty}
                  label="Difficulty"
                />
                <StarRating
                  value={energy}
                  onChange={setEnergy}
                  label="Energy"
                />
              </div>

              {/* Feedback Text */}
              <div>
                <Label htmlFor="feedback" className="text-sm font-medium mb-2 block">
                  Additional Comments (Optional)
                </Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="How did the workout feel? Any exercises that were particularly challenging or easy?"
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={submitFeedback}
                disabled={submittingFeedback}
                className="w-full h-12 bg-gradient-to-r from-primary to-accent text-white"
              >
                {submittingFeedback ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card variant="premium" className="border-green-200 bg-green-50/50">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-700 font-medium">
                Thanks for your feedback! Your coach will review your performance.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              // TODO: Implement sharing functionality
              if (navigator.share) {
                navigator.share({
                  title: 'Workout Complete!',
                  text: `Just finished "${workout.name}" - ${totalSets} sets, ${totalReps} reps in ${duration} minutes!`,
                })
              }
            }}
            className="flex-1 h-12"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          
          <Button
            onClick={onExit}
            className="flex-1 h-12 bg-gradient-to-r from-primary to-accent text-white"
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Motivational Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Every workout is a step forward. Keep up the great work! 🌟</p>
        </div>
      </div>
    </div>
  )
}
