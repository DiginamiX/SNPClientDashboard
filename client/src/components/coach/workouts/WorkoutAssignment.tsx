import React, { useState, useEffect } from 'react'
import { X, Users, Calendar, Send, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LoadingSpinner } from '@/components/ui/loading'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
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

interface WorkoutBuilderState {
  name: string
  description: string
  instructions: string
  exercises: WorkoutExercise[]
  estimatedDuration: number
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  workout_type: 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'recovery'
}

interface Client {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  avatar?: string
}

interface WorkoutAssignmentProps {
  workout: WorkoutBuilderState
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function WorkoutAssignment({ workout, open, onClose, onSuccess }: WorkoutAssignmentProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [scheduledDate, setScheduledDate] = useState<Date>()
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(true)

  const { user } = useSupabaseAuth()

  // Fetch coach's clients
  useEffect(() => {
    if (open && user) {
      fetchClients()
    }
  }, [open, user])

  const fetchClients = async () => {
    if (!user) return

    try {
      setLoadingClients(true)
      
      // Get coach-client relationships and user details
      const { data, error } = await supabase
        .from('coach_clients')
        .select(`
          client_id,
          users!coach_clients_client_id_fkey(
            id,
            first_name,
            last_name,
            email,
            avatar
          )
        `)
        .eq('coach_id', user.id)
        .eq('status', 'active')

      if (error) throw error

      const clientData = data?.map(item => ({
        id: item.client_id,
        user_id: item.client_id,
        first_name: item.users?.first_name || '',
        last_name: item.users?.last_name || '',
        email: item.users?.email || '',
        avatar: item.users?.avatar
      })) || []

      setClients(clientData)
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoadingClients(false)
    }
  }

  const handleClientToggle = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  const selectAllClients = () => {
    setSelectedClients(clients.map(client => client.id))
  }

  const deselectAllClients = () => {
    setSelectedClients([])
  }

  const assignWorkout = async () => {
    if (!user || selectedClients.length === 0) return

    setLoading(true)
    try {
      // First save the workout to get an ID, then create workout logs for each client
      const workoutData = {
        name: workout.name,
        description: workout.description,
        instructions: workout.instructions,
        estimatedDuration: workout.estimatedDuration
      }

      // Create the workout
      const workoutResponse = await fetch('/api/workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          workout: workoutData,
          exercises: workout.exercises.map(ex => ({
            exerciseId: ex.exercise.id,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            restSeconds: ex.rest_seconds,
            notes: ex.notes,
            orderIndex: ex.order_index
          }))
        })
      })

      if (!workoutResponse.ok) {
        throw new Error('Failed to save workout')
      }

      const savedWorkout = await workoutResponse.json()

      // Create workout logs for each selected client
      for (const clientId of selectedClients) {
        const workoutLogData = {
          clientId: parseInt(clientId),
          workoutId: savedWorkout.id,
          date: scheduledDate ? scheduledDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          status: 'planned',
          notes: assignmentNotes
        }

        await fetch('/api/workout-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(workoutLogData)
        })
      }

      onSuccess()
    } catch (error) {
      console.error('Error assigning workout:', error)
      // TODO: Show error toast
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-display text-gradient-orange">
                Assign Workout
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                "{workout.name}" to your clients
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Workout Summary */}
            <Card variant="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{workout.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{workout.exercises.length} exercises</span>
                      <span>•</span>
                      <span>{workout.exercises.reduce((total, ex) => total + ex.sets, 0)} sets</span>
                      <span>•</span>
                      <span>~{Math.round(workout.exercises.reduce((total, ex) => total + (ex.sets * 30 + ex.sets * ex.rest_seconds), 0) / 60)} min</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Select Clients</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllClients}
                    disabled={clients.length === 0}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAllClients}
                    disabled={selectedClients.length === 0}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {loadingClients ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="sm" variant="orange" />
                </div>
              ) : clients.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No Clients Found</h3>
                    <p className="text-muted-foreground">
                      You need to add clients before you can assign workouts.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {clients.map(client => (
                    <Card
                      key={client.id}
                      className={cn(
                        'cursor-pointer transition-all duration-200 hover:shadow-md',
                        selectedClients.includes(client.id) && 'ring-2 ring-primary bg-primary/5'
                      )}
                      onClick={() => handleClientToggle(client.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedClients.includes(client.id)}
                            onChange={() => handleClientToggle(client.id)}
                            className="pointer-events-none"
                          />
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            {client.avatar ? (
                              <img
                                src={client.avatar}
                                alt={`${client.first_name} ${client.last_name}`}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-primary font-semibold">
                                {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">
                              {client.first_name} {client.last_name}
                            </h4>
                            <p className="text-sm text-muted-foreground truncate">
                              {client.email}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {selectedClients.length > 0 && (
                <div className="mt-4">
                  <Badge variant="secondary">
                    {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''} selected
                  </Badge>
                </div>
              )}
            </div>

            {/* Schedule Date */}
            <div>
              <Label className="text-base font-semibold mb-4 block">Schedule Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !scheduledDate && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {scheduledDate ? format(scheduledDate, 'PPP') : 'Choose date (optional)'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-sm text-muted-foreground mt-2">
                Leave blank to assign immediately
              </p>
            </div>

            {/* Assignment Notes */}
            <div>
              <Label htmlFor="assignment-notes" className="text-base font-semibold mb-4 block">
                Assignment Notes (Optional)
              </Label>
              <Textarea
                id="assignment-notes"
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                placeholder="Add any specific instructions or motivational notes for your clients..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedClients.length > 0 ? (
                  <>Assigning to {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''}</>
                ) : (
                  'Select clients to assign this workout'
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={assignWorkout}
                  disabled={selectedClients.length === 0 || loading}
                  className="bg-gradient-to-r from-primary to-accent text-white"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Assign Workout
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
