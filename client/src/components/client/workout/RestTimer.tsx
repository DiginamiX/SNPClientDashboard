import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, SkipForward, Plus, Minus, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface RestTimerProps {
  duration: number // seconds
  onComplete: () => void
  onSkip: () => void
}

export default function RestTimer({ duration, onComplete, onSkip }: RestTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration)
  const [isRunning, setIsRunning] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Create audio context for timer sounds
    if (typeof window !== 'undefined' && soundEnabled) {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      const createBeep = (frequency: number, duration: number) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = frequency
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + duration)
      }

      // Store the beep function for later use
      audioRef.current = { beep: createBeep } as any
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [soundEnabled])

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1
          
          // Play warning sounds
          if (soundEnabled && audioRef.current) {
            if (newTime === 15 || newTime === 10 || newTime === 5) {
              // Warning beep
              ;(audioRef.current as any).beep?.(800, 0.2)
            } else if (newTime === 0) {
              // Completion beep
              ;(audioRef.current as any).beep?.(1200, 0.5)
            }
          }
          
          // Vibrate on mobile for warnings and completion
          if ('navigator' in window && 'vibrate' in navigator) {
            if (newTime === 15 || newTime === 10 || newTime === 5) {
              navigator.vibrate(100)
            } else if (newTime === 0) {
              navigator.vibrate([200, 100, 200])
            }
          }
          
          if (newTime <= 0) {
            onComplete()
            return 0
          }
          
          return newTime
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeRemaining, onComplete, soundEnabled])

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const addTime = (seconds: number) => {
    setTimeRemaining(prev => prev + seconds)
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const progress = ((duration - timeRemaining) / duration) * 100

  const getTimerColor = () => {
    if (timeRemaining <= 5) return 'text-red-500'
    if (timeRemaining <= 15) return 'text-yellow-500'
    return 'text-primary'
  }

  const getProgressColor = () => {
    if (timeRemaining <= 5) return 'bg-red-500'
    if (timeRemaining <= 15) return 'bg-yellow-500'
    return 'bg-primary'
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {/* Rest Timer Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Rest Timer</h2>
            <p className="text-sm text-muted-foreground">
              Take your time to recover between sets
            </p>
          </div>

          {/* Circular Progress */}
          <div className="relative w-48 h-48 mx-auto mb-6">
            {/* Background Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="text-muted-foreground/20"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${progress * 2.83} 283`}
                className={getProgressColor()}
                strokeLinecap="round"
              />
            </svg>
            
            {/* Timer Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-4xl font-bold ${getTimerColor()}`}>
                {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {timeRemaining <= 0 ? 'Time\'s up!' : 'remaining'}
              </div>
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => addTime(-15)}
              disabled={timeRemaining <= 15}
              className="h-12 w-12"
            >
              <Minus className="w-5 h-5" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleTimer}
              className="h-12 w-12"
            >
              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => addTime(15)}
              className="h-12 w-12"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          {/* Quick Time Adjustments */}
          <div className="flex justify-center gap-2 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addTime(30)}
              className="text-xs"
            >
              +30s
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addTime(60)}
              className="text-xs"
            >
              +1m
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-xs"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1 h-12"
            >
              <SkipForward className="w-4 h-4 mr-2" />
              Skip Rest
            </Button>
            
            {timeRemaining <= 0 && (
              <Button
                onClick={onComplete}
                className="flex-1 h-12 bg-gradient-to-r from-primary to-accent text-white"
              >
                Continue
              </Button>
            )}
          </div>

          {/* Helper Text */}
          <div className="mt-4 text-xs text-muted-foreground">
            {timeRemaining > 15 ? (
              'Rest until you feel ready for the next set'
            ) : timeRemaining > 5 ? (
              'Almost ready! Prepare for your next set'
            ) : timeRemaining > 0 ? (
              'Get ready! Next set starting soon'
            ) : (
              'Rest complete! Ready for your next set'
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
