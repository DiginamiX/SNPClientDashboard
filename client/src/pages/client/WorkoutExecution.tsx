import React from 'react'
import { useRoute } from 'wouter'
import WorkoutPlayer from '@/components/client/workout/WorkoutPlayer'

export default function WorkoutExecution() {
  const [match, params] = useRoute('/workout/:assignmentId')
  
  if (!match || !params?.assignmentId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Invalid Workout</h2>
          <p className="text-muted-foreground">
            Workout assignment not found
          </p>
        </div>
      </div>
    )
  }

  const assignmentId = parseInt(params.assignmentId)
  
  if (isNaN(assignmentId)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Invalid Workout ID</h2>
          <p className="text-muted-foreground">
            Please check the workout link and try again
          </p>
        </div>
      </div>
    )
  }

  return <WorkoutPlayer assignmentId={assignmentId} />
}
