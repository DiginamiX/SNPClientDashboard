import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../shared/supabase-types'

// Handle both browser (Vite) and Node.js environments
const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
                   process.env.SUPABASE_URL || 
                   process.env.VITE_SUPABASE_URL || 
                   'https://vdykrlyybwwbcqqcgjbp.supabase.co'

const supabaseKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
                   process.env.SUPABASE_ANON_KEY || 
                   process.env.VITE_SUPABASE_ANON_KEY || 
                   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeWtybHl5Ynd3YmNxcWNnamJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMzY2NzAsImV4cCI6MjA3MTcxMjY3MH0.McnQU03YULVB_dcwIa4QNmXml5YmTpOefa1ySkvBVEA'

export const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Helper functions for Supabase operations
export const supabaseHelpers = {
  // File upload to Supabase storage
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    return data
  },

  // Get public URL for uploaded file
  getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return data.publicUrl
  },

  // Delete file from storage
  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])
    
    if (error) throw error
  },

  // Real-time subscription helper
  subscribeToTable(table: string, callback: (payload: any) => void) {
    return supabase
      .channel(`public:${table}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table }, 
        callback
      )
      .subscribe()
  }
}

// Real-time subscription helper
export function subscribeToTable(
  table: string, 
  callback: (payload: any) => void,
  filter?: string
) {
  return supabase
    .channel(`${table}-changes`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table,
        filter 
      }, 
      callback
    )
    .subscribe()
}

// Enhanced auth helpers
export const auth = {
  signUp: async (email: string, password: string, metadata?: any) => {
    return await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: metadata
      }
    })
  },
  
  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password })
  },
  
  signInWithOAuth: async (provider: 'google' | 'github' | 'apple') => {
    return await supabase.auth.signInWithOAuth({ provider })
  },
  
  signOut: async () => {
    return await supabase.auth.signOut()
  },
  
  getUser: async () => {
    return await supabase.auth.getUser()
  },
  
  getSession: async () => {
    return await supabase.auth.getSession()
  },
  
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Database helpers with type safety
export const db = {
  // Generic CRUD operations
  async select<T>(table: string, columns = '*', filters?: any): Promise<T[]> {
    let query = supabase.from(table).select(columns)
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }
    
    const { data, error } = await query
    if (error) throw error
    return data as T[]
  },
  
  async insert<T>(table: string, data: any): Promise<T> {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return result as T
  },
  
  async update<T>(table: string, id: number | string, updates: any): Promise<T> {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as T
  },
  
  async delete(table: string, id: number | string): Promise<void> {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

export default supabase
