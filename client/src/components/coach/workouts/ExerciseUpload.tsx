import React, { useState, useRef } from 'react'
import { X, Upload, Video, Image, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { LoadingSpinner } from '@/components/ui/loading'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { apiRequestAuto, queryClient } from '@/lib/queryClient'
import { Exercise } from '@shared/schema'

interface ExerciseUploadProps {
  open: boolean
  onClose: () => void
  onSuccess: (exercise: Exercise) => void
  editExercise?: Exercise
}

const muscleGroupOptions = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'core', 'abs',
  'obliques', 'upper body', 'lower body', 'full body'
]

const equipmentOptions = [
  'bodyweight', 'dumbbells', 'barbell', 'kettlebell', 'resistance bands',
  'pull-up bar', 'bench', 'cable machine', 'smith machine', 'medicine ball',
  'suspension trainer', 'bosu ball', 'stability ball', 'foam roller'
]

const categoryOptions = [
  'Upper Body', 'Lower Body', 'Core', 'Cardio', 'Flexibility', 'Full Body'
]

export default function ExerciseUpload({ open, onClose, onSuccess, editExercise }: ExerciseUploadProps) {
  const [formData, setFormData] = useState({
    name: editExercise?.name || '',
    description: editExercise?.description || '',
    instructions: editExercise?.instructions || '',
    muscleGroups: editExercise?.muscleGroups || [],
    equipment: editExercise?.equipment || '',
    difficultyLevel: editExercise?.difficultyLevel || 'beginner',
    categoryId: editExercise?.categoryId ? editExercise.categoryId.toString() : '',
    caloriesPerMinute: editExercise?.caloriesPerMinute || '',
    isPublic: editExercise?.isPublic || false,
    tags: editExercise?.tags || []
  })

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(editExercise?.videoUrl || null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(editExercise?.thumbnailUrl || null)
  const [newMuscleGroup, setNewMuscleGroup] = useState('')
  const [newTag, setNewTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const { user } = useSupabaseAuth()

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideoFile(file)
      const url = URL.createObjectURL(file)
      setVideoPreview(url)
    }
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setThumbnailFile(file)
      const url = URL.createObjectURL(file)
      setThumbnailPreview(url)
    }
  }

  const addMuscleGroup = () => {
    if (newMuscleGroup && !formData.muscleGroups.includes(newMuscleGroup)) {
      handleInputChange('muscleGroups', [...formData.muscleGroups, newMuscleGroup])
      setNewMuscleGroup('')
    }
  }

  const removeMuscleGroup = (muscle: string) => {
    handleInputChange('muscleGroups', formData.muscleGroups.filter(m => m !== muscle))
  }

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      handleInputChange('tags', [...formData.tags, newTag])
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    handleInputChange('tags', formData.tags.filter(t => t !== tag))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setUploadProgress(0)

    try {
      let videoUrl = editExercise?.videoUrl
      let thumbnailUrl = editExercise?.thumbnailUrl

      // Upload video if provided
      if (videoFile) {
        setUploadProgress(25)
        // TODO: Implement upload endpoint
        const result = { url: 'placeholder-video-url' }
        videoUrl = result.url
      }

      // Upload thumbnail if provided
      if (thumbnailFile) {
        setUploadProgress(50)
        // TODO: Implement upload endpoint
        const result = { url: 'placeholder-thumbnail-url' }
        thumbnailUrl = result.url
      }

      setUploadProgress(75)

      // Create/update exercise via API
      const exerciseData = {
        name: formData.name,
        description: formData.description,
        instructions: formData.instructions,
        muscleGroups: formData.muscleGroups,
        equipment: formData.equipment,
        difficultyLevel: formData.difficultyLevel,
        categoryId: formData.categoryId ? parseInt(formData.categoryId.toString()) : null,
        videoUrl: videoUrl,
        thumbnailUrl: thumbnailUrl,
        isPublic: formData.isPublic,
        tags: formData.tags,
        caloriesPerMinute: formData.caloriesPerMinute ? parseInt(formData.caloriesPerMinute.toString()) : null
      }

      let result
      if (editExercise) {
        // Update existing exercise
        const response = await apiRequestAuto('PATCH', `/api/exercises/${editExercise.id}`, exerciseData)
        result = await response.json()
      } else {
        // Create new exercise
        const response = await apiRequestAuto('POST', '/api/exercises', exerciseData)
        result = await response.json()
      }

      // Invalidate exercises cache
      queryClient.invalidateQueries({ queryKey: ['/api/exercises'] })
      
      setUploadProgress(100)
      onSuccess(result)
      
    } catch (error) {
      console.error('Error saving exercise:', error)
      // TODO: Show error toast
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      instructions: '',
      muscleGroups: [],
      equipment: '',
      difficultyLevel: 'beginner',
      categoryId: '',
      caloriesPerMinute: '',
      isPublic: false,
      tags: []
    })
    setVideoFile(null)
    setThumbnailFile(null)
    setVideoPreview(null)
    setThumbnailPreview(null)
    setNewMuscleGroup('')
    setNewTag('')
  }

  const handleClose = () => {
    if (!editExercise) {
      resetForm()
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-display text-gradient-orange">
              {editExercise ? 'Edit Exercise' : 'Add New Exercise'}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Basic Information */}
            <Card variant="premium">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold text-lg">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Exercise Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g., Push-ups"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.categoryId} onValueChange={(value) => handleInputChange('categoryId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Brief description of the exercise"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => handleInputChange('instructions', e.target.value)}
                    placeholder="Step-by-step instructions for performing the exercise"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Exercise Details */}
            <Card variant="premium">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold text-lg">Exercise Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select value={formData.difficultyLevel} onValueChange={(value) => handleInputChange('difficultyLevel', value)}>
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
                    <Label htmlFor="equipment">Equipment</Label>
                    <Select value={formData.equipment} onValueChange={(value) => handleInputChange('equipment', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select equipment" />
                      </SelectTrigger>
                      <SelectContent>
                        {equipmentOptions.map(equipment => (
                          <SelectItem key={equipment} value={equipment}>
                            {equipment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="calories">Calories per minute</Label>
                    <Input
                      id="calories"
                      type="number"
                      step="0.1"
                      value={formData.caloriesPerMinute}
                      onChange={(e) => handleInputChange('caloriesPerMinute', e.target.value)}
                      placeholder="e.g., 8.5"
                    />
                  </div>
                </div>

                {/* Muscle Groups */}
                <div>
                  <Label>Target Muscle Groups</Label>
                  <div className="flex gap-2 mb-2">
                    <Select value={newMuscleGroup} onValueChange={setNewMuscleGroup}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Add muscle group" />
                      </SelectTrigger>
                      <SelectContent>
                        {muscleGroupOptions
                          .filter(muscle => !formData.muscleGroups.includes(muscle))
                          .map(muscle => (
                            <SelectItem key={muscle} value={muscle}>
                              {muscle}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={addMuscleGroup} size="icon" variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.muscleGroups.map(muscle => (
                      <Badge key={muscle} variant="secondary" className="gap-1">
                        {muscle}
                        <button
                          type="button"
                          onClick={() => removeMuscleGroup(muscle)}
                          className="hover:bg-red-500 hover:text-white rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label>Tags</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} size="icon" variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:bg-red-500 hover:text-white rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Media Upload */}
            <Card variant="premium">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold text-lg">Media</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Video Upload */}
                  <div>
                    <Label>Exercise Video</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                      {videoPreview ? (
                        <div className="relative">
                          <video
                            src={videoPreview}
                            className="w-full aspect-video object-cover rounded"
                            controls
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setVideoFile(null)
                              setVideoPreview(null)
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Video className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => videoInputRef.current?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Video
                          </Button>
                        </div>
                      )}
                    </div>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoChange}
                      className="hidden"
                    />
                  </div>

                  {/* Thumbnail Upload */}
                  <div>
                    <Label>Thumbnail Image</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                      {thumbnailPreview ? (
                        <div className="relative">
                          <img
                            src={thumbnailPreview}
                            alt="Thumbnail"
                            className="w-full aspect-video object-cover rounded"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setThumbnailFile(null)
                              setThumbnailPreview(null)
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => thumbnailInputRef.current?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Image
                          </Button>
                        </div>
                      )}
                    </div>
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visibility Settings */}
            <Card variant="glass">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="public">Make Public</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow other coaches to use this exercise
                    </p>
                  </div>
                  <Switch
                    id="public"
                    checked={formData.isPublic}
                    onCheckedChange={(checked) => handleInputChange('isPublic', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Upload Progress */}
            {loading && uploadProgress > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <LoadingSpinner size="sm" variant="orange" />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/30">
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !formData.name}
                className="bg-gradient-to-r from-primary to-accent text-white"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {editExercise ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editExercise ? 'Update Exercise' : 'Create Exercise'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
