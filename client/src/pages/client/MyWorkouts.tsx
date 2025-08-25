import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Target, PlayCircle, CheckCircle, Timer } from "lucide-react";
import { format } from "date-fns";

interface WorkoutAssignment {
  id: number;
  workout_id: number;
  scheduled_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  notes?: string;
  assigned_by: string;
  workouts: {
    id: number;
    name: string;
    description?: string;
    estimated_duration?: number;
    difficulty_rating?: number;
    workout_type?: string;
    workout_exercises: Array<{
      id: number;
      sets: number;
      reps: string;
      exercises: {
        id: number;
        name: string;
        muscle_groups: string[];
        equipment?: string;
        thumbnail_url?: string;
      };
    }>;
  };
  workout_sessions: Array<{
    id: number;
    status: string;
    start_time: string;
  }>;
}

const statusConfig = {
  pending: { 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    label: 'Pending'
  },
  in_progress: { 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    label: 'In Progress'
  },
  completed: { 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    label: 'Completed'
  },
  skipped: { 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    label: 'Skipped'
  }
};

export default function MyWorkouts() {
  const [assignments, setAssignments] = useState<WorkoutAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [, setLocation] = useLocation();
  
  const { user } = useSupabaseAuth();

  useEffect(() => {
    if (user) {
      fetchWorkoutAssignments();
    }
  }, [user]);

  const fetchWorkoutAssignments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('workout_assignments')
        .select(`
          id,
          workout_id,
          scheduled_date,
          status,
          notes,
          assigned_by,
          workouts!inner (
            id,
            name,
            description,
            estimated_duration,
            difficulty_rating,
            workout_type,
            workout_exercises (
              id,
              sets,
              reps,
              exercises (
                id,
                name,
                muscle_groups,
                equipment,
                thumbnail_url
              )
            )
          ),
          workout_sessions (
            id,
            status,
            start_time
          )
        `)
        .eq('client_id', user.id)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;

      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching workout assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const startWorkout = (assignment: WorkoutAssignment) => {
    setLocation(`/workout/${assignment.id}`);
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (filter === 'all') return true;
    if (filter === 'pending') return assignment.status === 'pending' || assignment.status === 'in_progress';
    if (filter === 'completed') return assignment.status === 'completed';
    return true;
  });

  const getMuscleGroups = (exercises: any[]) => {
    const allMuscleGroups = exercises.flatMap(ex => ex.exercises.muscle_groups || []);
    return Array.from(new Set(allMuscleGroups)).slice(0, 3);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded"></div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Workouts</h1>
          <p className="text-muted-foreground">
            View and manage your assigned workouts
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({assignments.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
        >
          Pending ({assignments.filter(a => a.status === 'pending' || a.status === 'in_progress').length})
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          Completed ({assignments.filter(a => a.status === 'completed').length})
        </Button>
      </div>

      {/* Workouts list */}
      <div className="grid gap-4">
        {filteredAssignments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No workouts found</h3>
              <p className="text-muted-foreground">
                {filter === 'all' 
                  ? "You don't have any assigned workouts yet." 
                  : `No ${filter} workouts found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAssignments.map((assignment) => {
            const workout = assignment.workouts;
            const muscleGroups = getMuscleGroups(workout.workout_exercises);
            const isCompleted = assignment.status === 'completed';
            const canStart = assignment.status === 'pending' || assignment.status === 'in_progress';

            return (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{workout.name}</CardTitle>
                      {workout.description && (
                        <p className="text-sm text-muted-foreground">
                          {workout.description}
                        </p>
                      )}
                    </div>
                    <Badge className={statusConfig[assignment.status].color}>
                      {statusConfig[assignment.status].label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Workout details */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(assignment.scheduled_date), 'MMM d, yyyy')}
                      </div>
                      {workout.estimated_duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {workout.estimated_duration} min
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {workout.workout_exercises.length} exercises
                      </div>
                    </div>

                    {/* Muscle groups */}
                    {muscleGroups.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {muscleGroups.map((group) => (
                          <Badge key={group} variant="secondary" className="text-xs">
                            {group}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      {canStart && (
                        <Button 
                          onClick={() => startWorkout(assignment)}
                          className="flex-1"
                          size="sm"
                        >
                          <PlayCircle className="w-4 h-4 mr-1" />
                          {assignment.status === 'in_progress' ? 'Continue' : 'Start'} Workout
                        </Button>
                      )}
                      {isCompleted && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setLocation(`/workout/${assignment.id}`)}
                          className="flex-1"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          View Results
                        </Button>
                      )}
                    </div>

                    {/* Session info for in-progress */}
                    {assignment.status === 'in_progress' && assignment.workout_sessions.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                        <Timer className="w-3 h-3" />
                        Started {format(new Date(assignment.workout_sessions[0].start_time), 'MMM d, h:mm a')}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}