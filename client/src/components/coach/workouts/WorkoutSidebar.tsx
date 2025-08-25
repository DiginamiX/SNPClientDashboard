import React, { useState, useEffect, useMemo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Search, Filter, X, Target, Play } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LoadingSpinner } from '@/components/ui/loading'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase'
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

interface WorkoutSidebarProps {
  open: boolean
  onClose: () => void
  onExerciseSelect: (exercise: Exercise) => void
}

function DraggableExerciseCard({ exercise, onSelect }: { exercise: Exercise, onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-exercise-${exercise.id}`,
    data: {
      type: 'library-exercise',
      exercise
    }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md',
        isDragging && 'opacity-50 scale-105 shadow-2xl rotate-2'
      )}
      {...listeners}
      {...attributes}
    >
      <CardContent className="p-3">
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="relative flex-shrink-0">
            {exercise.thumbnail_url || exercise.video_url ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                <img
                  src={exercise.thumbnail_url || exercise.video_url}
                  alt={exercise.name}
                  className="w-full h-full object-cover"
                />
                {exercise.video_url && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/50 transition-opacity">
                    <Play className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Target className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Exercise Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate mb-1">{exercise.name}</h4>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                {exercise.difficulty_level}
              </Badge>
              {exercise.equipment && (
                <span className="text-xs text-muted-foreground truncate">
                  {exercise.equipment}
                </span>
              )}
            </div>
            {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {exercise.muscle_groups.slice(0, 2).map(muscle => (
                  <Badge key={muscle} variant="secondary" className="text-xs px-1 py-0">
                    {muscle}
                  </Badge>
                ))}
                {exercise.muscle_groups.length > 2 && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    +{exercise.muscle_groups.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Add Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          className="w-full mt-2 h-7 text-xs"
        >
          Quick Add
        </Button>
      </CardContent>
    </Card>
  )
}

export default function WorkoutSidebar({ open, onClose, onExerciseSelect }: WorkoutSidebarProps) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const { user } = useSupabaseAuth()

  // Fetch exercises
  useEffect(() => {
    fetchExercises()
  }, [user])

  const fetchExercises = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .or(`is_public.eq.true,created_by.eq.${user.id}`)
        .order('name')

      if (error) throw error
      setExercises(data || [])
    } catch (error) {
      console.error('Error fetching exercises:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique values for filters
  const uniqueCategories = useMemo(() => {
    const categories = exercises.map(e => e.category).filter(Boolean)
    return [...new Set(categories)].sort()
  }, [exercises])

  const uniqueEquipment = useMemo(() => {
    const equipment = exercises.map(e => e.equipment).filter(Boolean)
    return [...new Set(equipment)].sort()
  }, [exercises])

  // Filter exercises
  const filteredExercises = useMemo(() => {
    return exercises.filter(exercise => {
      const matchesSearch = !searchTerm || 
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.muscle_groups?.some(mg => mg.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesCategory = selectedCategory === 'all' || exercise.category === selectedCategory
      const matchesDifficulty = selectedDifficulty === 'all' || exercise.difficulty_level === selectedDifficulty
      const matchesEquipment = selectedEquipment === 'all' || exercise.equipment === selectedEquipment

      return matchesSearch && matchesCategory && matchesDifficulty && matchesEquipment
    })
  }, [exercises, searchTerm, selectedCategory, selectedDifficulty, selectedEquipment])

  if (!open) return null

  return (
    <div className="w-80 border-r bg-card/50 backdrop-blur-sm flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Exercise Library</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search exercises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Filter Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="w-full justify-start gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {(selectedCategory !== 'all' || selectedDifficulty !== 'all' || selectedEquipment !== 'all') && (
            <Badge variant="secondary" className="ml-auto">Active</Badge>
          )}
        </Button>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-3 mt-3 pt-3 border-t">
            <div>
              <Label className="text-xs font-medium mb-1 block">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium mb-1 block">Difficulty</Label>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium mb-1 block">Equipment</Label>
              <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Equipment</SelectItem>
                  {uniqueEquipment.map(equipment => (
                    <SelectItem key={equipment} value={equipment}>
                      {equipment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-3">
          {filteredExercises.length} of {exercises.length} exercises
        </div>
      </div>

      {/* Exercise List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="sm" variant="orange" />
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchTerm || selectedCategory !== 'all' || selectedDifficulty !== 'all' || selectedEquipment !== 'all'
                  ? 'No exercises match your filters'
                  : 'No exercises found'
                }
              </p>
            </div>
          ) : (
            filteredExercises.map(exercise => (
              <DraggableExerciseCard
                key={exercise.id}
                exercise={exercise}
                onSelect={() => onExerciseSelect(exercise)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Instructions */}
      <div className="border-t p-4 bg-muted/30">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 <strong>Drag</strong> exercises to add them to your workout</p>
          <p>🔧 <strong>Click "Quick Add"</strong> for instant addition</p>
          <p>🎯 <strong>Configure</strong> sets, reps, and weight after adding</p>
        </div>
      </div>
    </div>
  )
}

function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('text-sm font-medium leading-none', className)} {...props}>
      {children}
    </label>
  )
}
