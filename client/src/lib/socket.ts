import { io, Socket } from 'socket.io-client'

interface SocketEvents {
  // Message events
  'send-message': (data: { room: string; message: any }) => void
  'receive-message': (data: any) => void
  'message-read': (data: { messageId: number; userId: string }) => void
  
  // Workout events
  'workout-start': (data: { workoutLogId: number; clientId: number }) => void
  'workout-progress': (data: { workoutLogId: number; exerciseId: number; progress: any }) => void
  'workout-complete': (data: { workoutLogId: number; clientId: number; summary: any }) => void
  
  // Progress events
  'progress-update': (data: { clientId: number; type: string; data: any }) => void
  'weight-logged': (data: { clientId: number; weight: number; date: string }) => void
  
  // Coach events
  'client-online': (data: { clientId: number; status: 'online' | 'offline' }) => void
  'assignment-created': (data: { clientId: number; type: 'workout' | 'meal_plan'; assignmentId: number }) => void
}

class SocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect(userId: string, userRole: 'client' | 'admin'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '', {
          auth: {
            userId,
            userRole
          },
          transports: ['websocket', 'polling'],
          timeout: 5000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay
        })

        this.socket.on('connect', () => {
          console.log('Socket connected:', this.socket?.id)
          this.reconnectAttempts = 0
          
          // Join user-specific room
          this.socket?.emit('join-room', `user-${userId}`)
          
          // Join role-specific room
          this.socket?.emit('join-room', `${userRole}s`)
          
          resolve()
        })

        this.socket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason)
        })

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error)
          this.reconnectAttempts++
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Failed to connect to real-time server'))
          }
        })

        this.socket.on('reconnect', (attemptNumber) => {
          console.log('Socket reconnected after', attemptNumber, 'attempts')
          this.reconnectAttempts = 0
        })

      } catch (error) {
        reject(error)
      }
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Generic event emission
  emit<K extends keyof SocketEvents>(event: K, data: Parameters<SocketEvents[K]>[0]): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('Socket not connected. Cannot emit event:', event)
    }
  }

  // Generic event listening
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (this.socket) {
      this.socket.on(event, callback as any)
    }
  }

  // Remove event listener
  off<K extends keyof SocketEvents>(event: K, callback?: SocketEvents[K]): void {
    if (this.socket) {
      this.socket.off(event, callback as any)
    }
  }

  // Join a specific room (e.g., coach-client conversation)
  joinRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-room', room)
    }
  }

  // Leave a specific room
  leaveRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave-room', room)
    }
  }

  // Messaging methods
  private getConversationRoom(otherUserId: string): string {
    const currentUserId = (this.socket?.auth as { userId?: string } | undefined)?.userId
    if (!currentUserId) {
      return `conversation-${otherUserId}`
    }
    return [currentUserId, otherUserId].sort().join('::')
  }

  sendMessage(recipientId: string, content: string, type: 'text' | 'image' | 'workout' | 'meal_plan' = 'text'): void {
    this.emit('send-message', {
      room: this.getConversationRoom(recipientId),
      message: {
        recipientId,
        content,
        type,
        timestamp: new Date().toISOString()
      }
    })
  }

  // Workout tracking methods
  startWorkout(workoutLogId: number, clientId: number): void {
    this.emit('workout-start', { workoutLogId, clientId })
  }

  updateWorkoutProgress(workoutLogId: number, exerciseId: number, progress: any): void {
    this.emit('workout-progress', { workoutLogId, exerciseId, progress })
  }

  completeWorkout(workoutLogId: number, clientId: number, summary: any): void {
    this.emit('workout-complete', { workoutLogId, clientId, summary })
  }

  // Progress tracking methods
  logProgress(clientId: number, type: string, data: any): void {
    this.emit('progress-update', { clientId, type, data })
  }

  logWeight(clientId: number, weight: number, date: string): void {
    this.emit('weight-logged', { clientId, weight, date })
  }

  // Status methods
  get isConnected(): boolean {
    return this.socket?.connected || false
  }

  get socketId(): string | undefined {
    return this.socket?.id
  }
}

// Create singleton instance
export const socketService = new SocketService()

// React hook for socket integration
export function useSocket() {
  return {
    socket: socketService,
    isConnected: socketService.isConnected,
    socketId: socketService.socketId
  }
}

export default socketService
