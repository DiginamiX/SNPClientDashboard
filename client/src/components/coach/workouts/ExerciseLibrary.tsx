import React, { useState, useEffect, useMemo } from 'react'
import { Search, Filter, Plus, Video, Eye, Edit, Trash2, Target, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/ui/loading'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase'
import ExerciseCard from './ExerciseCard'
import ExercisePreview from './ExercisePreview'
import ExerciseUpload from './ExerciseUpload'

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
  created_by: string
  is_public: boolean
  tags: string[]
  category: string
  calories_per_minute?: number
  created_at: string
  updated_at: string
}

interface ExerciseCategory {
  id: number
  name: string
  description: string
  icon_name: string
  color_hex: string
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
}

const muscleGroupColors = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400'
]

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [categories, setCategories] = useState<ExerciseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  
  const { user } = useSupabaseAuth()

  // Fetch exercises and categories
  useEffect(() => {
    fetchExercises()
    fetchCategories()
  }, [])

  const fetchExercises = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .or(`is_public.eq.true,created_by.eq.${user?.id}`)
        .order('name')

      if (error) throw error
      setExercises(data || [])
    } catch (error) {
      console.error('Error fetching exercises:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('exercise_categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  // Get unique values for filters
  const uniqueEquipment = useMemo(() => {
    const equipment = exercises.map(e => e.equipment).filter(Boolean)
    return [...new Set(equipment)].sort()
  }, [exercises])

  const uniqueMuscleGroups = useMemo(() => {
    const muscleGroups = exercises.flatMap(e => e.muscle_groups || [])
    return [...new Set(muscleGroups)].sort()
  }, [exercises])

  // Filter exercises based on search and filters
  const filteredExercises = useMemo(() => {
    return exercises.filter(exercise => {
      // Search filter
      const matchesSearch = !searchTerm || 
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.muscle_groups?.some(mg => mg.toLowerCase().includes(searchTerm.toLowerCase()))

      // Category filter
      const matchesCategory = selectedCategory === 'all' || exercise.category === selectedCategory

      // Difficulty filter
      const matchesDifficulty = selectedDifficulty === 'all' || exercise.difficulty_level === selectedDifficulty

      // Equipment filter
      const matchesEquipment = selectedEquipment === 'all' || exercise.equipment === selectedEquipment

      // Muscle group filter
      const matchesMuscleGroup = selectedMuscleGroup === 'all' || 
        exercise.muscle_groups?.includes(selectedMuscleGroup)

      // Tab filter
      const matchesTab = activeTab === 'all' || 
        (activeTab === 'my' && exercise.created_by === user?.id) ||
        (activeTab === 'public' && exercise.is_public)

      return matchesSearch && matchesCategory && matchesDifficulty && 
             matchesEquipment && matchesMuscleGroup && matchesTab
    })
  }, [exercises, searchTerm, selectedCategory, selectedDifficulty, selectedEquipment, selectedMuscleGroup, activeTab, user?.id])

  const handleExerciseUpdate = (updatedExercise: Exercise) => {
    setExercises(prev => prev.map(ex => 
      ex.id === updatedExercise.id ? updatedExercise : ex
    ))
  }

  const handleExerciseDelete = async (exerciseId: number) => {
    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId)

      if (error) throw error
      
      setExercises(prev => prev.filter(ex => ex.id !== exerciseId))
    } catch (error) {
      console.error('Error deleting exercise:', error)
    }
  }

  if (loading) {
    return (
      <Card variant="premium">
        <CardContent className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" variant="orange" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-gradient-orange">Exercise Library</h2>
          <p className="text-muted-foreground">
            Comprehensive exercise database with {exercises.length} exercises
          </p>
        </div>
        <Button 
          onClick={() => setShowUpload(true)}
          className="bg-gradient-to-r from-primary to-accent text-white hover:shadow-orange-glow"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Exercise
        </Button>
      </div>

      {/* Search and Filters */}
      <Card variant="glass">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search exercises by name, muscle group, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
                {(selectedCategory !== 'all' || selectedDifficulty !== 'all' || 
                  selectedEquipment !== 'all' || selectedMuscleGroup !== 'all') && (
                  <Badge variant="secondary" className="ml-2">Active</Badge>
                )}
              </Button>

              <div className="text-sm text-muted-foreground">
                {filteredExercises.length} of {exercises.length} exercises
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty</label>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Levels" />
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
                  <label className="text-sm font-medium mb-2 block">Equipment</label>
                  <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Equipment" />
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

                <div>
                  <label className="text-sm font-medium mb-2 block">Muscle Group</label>
                  <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Muscles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Muscles</SelectItem>
                      {uniqueMuscleGroups.map(muscle => (
                        <SelectItem key={muscle} value={muscle}>
                          {muscle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Exercise Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Exercises</TabsTrigger>
          <TabsTrigger value="my">My Exercises</TabsTrigger>
          <TabsTrigger value="public">Public Library</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredExercises.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <Target className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No exercises found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || selectedCategory !== 'all' || selectedDifficulty !== 'all' || 
                   selectedEquipment !== 'all' || selectedMuscleGroup !== 'all'
                    ? "Try adjusting your search or filters"
                    : "Start building your exercise library"}
                </p>
                <Button onClick={() => setShowUpload(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Exercise
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExercises.map(exercise => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onPreview={() => setPreviewExercise(exercise)}
                  onUpdate={handleExerciseUpdate}
                  onDelete={handleExerciseDelete}
                  showActions={exercise.created_by === user?.id}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Exercise Preview Modal */}
      {previewExercise && (
        <ExercisePreview
          exercise={previewExercise}
          open={!!previewExercise}
          onClose={() => setPreviewExercise(null)}
        />
      )}

      {/* Exercise Upload Modal */}
      {showUpload && (
        <ExerciseUpload
          open={showUpload}
          onClose={() => setShowUpload(false)}
          onSuccess={(newExercise) => {
            setExercises(prev => [newExercise, ...prev])
            setShowUpload(false)
          }}
        />
      )}
    </div>
  )
}
