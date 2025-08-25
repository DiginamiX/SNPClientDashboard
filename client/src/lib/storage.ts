// Cloudflare R2 integration for file uploads
// This will be used for exercise videos, progress photos, and other media

interface UploadConfig {
  maxFileSize: number // in bytes
  allowedTypes: string[]
  generateThumbnail?: boolean
}

const defaultConfig: UploadConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'],
  generateThumbnail: false
}

export class StorageService {
  private baseUrl: string
  
  constructor() {
    this.baseUrl = '/api/upload' // Our backend upload endpoint
  }

  async uploadFile(
    file: File, 
    folder: string = 'general',
    config: Partial<UploadConfig> = {}
  ): Promise<{ url: string; thumbnailUrl?: string }> {
    const finalConfig = { ...defaultConfig, ...config }
    
    // Validate file
    this.validateFile(file, finalConfig)
    
    // Create form data
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    formData.append('generateThumbnail', finalConfig.generateThumbnail?.toString() || 'false')
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }
      
      const result = await response.json()
      return {
        url: result.url,
        thumbnailUrl: result.thumbnailUrl
      }
    } catch (error) {
      console.error('Upload error:', error)
      throw new Error('Failed to upload file')
    }
  }

  async uploadExerciseVideo(file: File): Promise<{ url: string; thumbnailUrl: string }> {
    return this.uploadFile(file, 'exercise-videos', {
      maxFileSize: 100 * 1024 * 1024, // 100MB for videos
      allowedTypes: ['video/mp4', 'video/webm', 'video/mov'],
      generateThumbnail: true
    })
  }

  async uploadProgressPhoto(file: File, clientId: number): Promise<{ url: string }> {
    return this.uploadFile(file, `progress-photos/${clientId}`, {
      maxFileSize: 10 * 1024 * 1024, // 10MB for photos
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
    })
  }

  async uploadAvatar(file: File, userId: number): Promise<{ url: string }> {
    return this.uploadFile(file, `avatars/${userId}`, {
      maxFileSize: 5 * 1024 * 1024, // 5MB for avatars
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
    })
  }

  async uploadMealPhoto(file: File): Promise<{ url: string }> {
    return this.uploadFile(file, 'meal-photos', {
      maxFileSize: 10 * 1024 * 1024, // 10MB for meal photos
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
    })
  }

  private validateFile(file: File, config: UploadConfig): void {
    if (file.size > config.maxFileSize) {
      throw new Error(`File too large. Maximum size: ${this.formatFileSize(config.maxFileSize)}`)
    }
    
    if (!config.allowedTypes.includes(file.type)) {
      throw new Error(`File type not allowed. Allowed types: ${config.allowedTypes.join(', ')}`)
    }
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  // Helper to generate presigned URLs for direct uploads (future enhancement)
  async getUploadUrl(fileName: string, fileType: string, folder: string): Promise<string> {
    const response = await fetch('/api/upload/presigned', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        fileType,
        folder
      }),
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to get upload URL')
    }
    
    const { uploadUrl } = await response.json()
    return uploadUrl
  }
}

export const storage = new StorageService()
export default storage
