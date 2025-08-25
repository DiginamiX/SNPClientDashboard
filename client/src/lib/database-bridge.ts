/**
 * Database Bridge - Unified interface for both existing PostgreSQL/Drizzle and Supabase
 * This allows gradual migration and fallback capabilities
 */

import { supabase, db as supabaseDb } from './supabase'
import type { Database } from '../../../shared/supabase-types'

type SupabaseTable = keyof Database['public']['Tables']

interface DatabaseConfig {
  preferSupabase: boolean
  fallbackToExisting: boolean
}

class DatabaseBridge {
  private config: DatabaseConfig = {
    preferSupabase: true,
    fallbackToExisting: true
  }

  constructor(config?: Partial<DatabaseConfig>) {
    this.config = { ...this.config, ...config }
  }

  /**
   * Generic select operation that works with both databases
   */
  async select<T>(
    table: string,
    columns: string = '*',
    filters?: Record<string, any>,
    options?: {
      limit?: number
      offset?: number
      orderBy?: { column: string; ascending?: boolean }
    }
  ): Promise<T[]> {
    if (this.config.preferSupabase) {
      try {
        return await this.selectFromSupabase<T>(table, columns, filters, options)
      } catch (error) {
        console.warn(`Supabase select failed for ${table}:`, error)
        if (this.config.fallbackToExisting) {
          return await this.selectFromExisting<T>(table, columns, filters, options)
        }
        throw error
      }
    } else {
      return await this.selectFromExisting<T>(table, columns, filters, options)
    }
  }

  /**
   * Generic insert operation
   */
  async insert<T>(table: string, data: any): Promise<T> {
    if (this.config.preferSupabase) {
      try {
        return await this.insertToSupabase<T>(table, data)
      } catch (error) {
        console.warn(`Supabase insert failed for ${table}:`, error)
        if (this.config.fallbackToExisting) {
          return await this.insertToExisting<T>(table, data)
        }
        throw error
      }
    } else {
      return await this.insertToExisting<T>(table, data)
    }
  }

  /**
   * Generic update operation
   */
  async update<T>(table: string, id: number | string, updates: any): Promise<T> {
    if (this.config.preferSupabase) {
      try {
        return await this.updateInSupabase<T>(table, id, updates)
      } catch (error) {
        console.warn(`Supabase update failed for ${table}:`, error)
        if (this.config.fallbackToExisting) {
          return await this.updateInExisting<T>(table, id, updates)
        }
        throw error
      }
    } else {
      return await this.updateInExisting<T>(table, id, updates)
    }
  }

  /**
   * Generic delete operation
   */
  async delete(table: string, id: number | string): Promise<void> {
    if (this.config.preferSupabase) {
      try {
        await this.deleteFromSupabase(table, id)
      } catch (error) {
        console.warn(`Supabase delete failed for ${table}:`, error)
        if (this.config.fallbackToExisting) {
          await this.deleteFromExisting(table, id)
        } else {
          throw error
        }
      }
    } else {
      await this.deleteFromExisting(table, id)
    }
  }

  // Supabase implementations
  private async selectFromSupabase<T>(
    table: string,
    columns: string,
    filters?: Record<string, any>,
    options?: any
  ): Promise<T[]> {
    let query = supabase.from(table as SupabaseTable).select(columns)

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })
    }

    // Apply options
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1)
    }
    if (options?.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true })
    }

    const { data, error } = await query
    if (error) throw error
    return data as T[]
  }

  private async insertToSupabase<T>(table: string, data: any): Promise<T> {
    const { data: result, error } = await supabase
      .from(table as SupabaseTable)
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return result as T
  }

  private async updateInSupabase<T>(table: string, id: number | string, updates: any): Promise<T> {
    const { data, error } = await supabase
      .from(table as SupabaseTable)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as T
  }

  private async deleteFromSupabase(table: string, id: number | string): Promise<void> {
    const { error } = await supabase
      .from(table as SupabaseTable)
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Existing database implementations (fallback to API calls)
  private async selectFromExisting<T>(
    table: string,
    columns: string,
    filters?: Record<string, any>,
    options?: any
  ): Promise<T[]> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        params.append(key, String(value))
      })
    }
    
    if (options?.limit) params.append('limit', String(options.limit))
    if (options?.offset) params.append('offset', String(options.offset))
    if (options?.orderBy) {
      params.append('orderBy', options.orderBy.column)
      params.append('ascending', String(options.orderBy.ascending ?? true))
    }

    const response = await fetch(`/api/${table}?${params}`, {
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch from ${table}: ${response.statusText}`)
    }

    return await response.json()
  }

  private async insertToExisting<T>(table: string, data: any): Promise<T> {
    const response = await fetch(`/api/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error(`Failed to insert to ${table}: ${response.statusText}`)
    }

    return await response.json()
  }

  private async updateInExisting<T>(table: string, id: number | string, updates: any): Promise<T> {
    const response = await fetch(`/api/${table}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates),
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error(`Failed to update ${table}: ${response.statusText}`)
    }

    return await response.json()
  }

  private async deleteFromExisting(table: string, id: number | string): Promise<void> {
    const response = await fetch(`/api/${table}/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error(`Failed to delete from ${table}: ${response.statusText}`)
    }
  }

  // Specialized methods for common operations
  async getUsers(filters?: { role?: 'client' | 'admin'; active?: boolean }) {
    return this.select('users', '*', filters)
  }

  async getClientsByCoach(coachId: string) {
    return this.select('coach_clients', `
      *,
      client:clients(
        *,
        user:users(*)
      )
    `, { coach_id: coachId, status: 'active' })
  }

  async getWorkoutsByProgram(programId: number) {
    return this.select('workouts', `
      *,
      workout_exercises(
        *,
        exercise:exercises(*)
      )
    `, { program_id: programId }, { orderBy: { column: 'day_number' } })
  }

  async getMessagesForConversation(userId: string, otherUserId: string) {
    // This is more complex, so we'll use Supabase directly for real-time features
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id(first_name, last_name, avatar)
      `)
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  }

  // Real-time subscriptions (Supabase only)
  subscribeToMessages(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`messages-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `or(sender_id.eq.${userId},recipient_id.eq.${userId})`
      }, callback)
      .subscribe()
  }

  subscribeToWorkoutLogs(clientId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`workout-logs-${clientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workout_logs',
        filter: `client_id.eq.${clientId}`
      }, callback)
      .subscribe()
  }

  subscribeToProgressUpdates(clientId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`progress-${clientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'weight_logs',
        filter: `client_id.eq.${clientId}`
      }, callback)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'progress_photos',
        filter: `client_id.eq.${clientId}`
      }, callback)
      .subscribe()
  }

  // Migration helpers
  async migrateUserToSupabase(userId: number) {
    try {
      // Get user from existing system
      const existingUser = await this.selectFromExisting('users', '*', { id: userId })
      
      if (existingUser.length === 0) {
        throw new Error(`User ${userId} not found in existing system`)
      }

      // Insert to Supabase
      const supabaseUser = await this.insertToSupabase('users', {
        ...existingUser[0],
        id: undefined // Let Supabase generate new UUID
      })

      console.log(`Successfully migrated user ${userId} to Supabase:`, supabaseUser)
      return supabaseUser
    } catch (error) {
      console.error(`Failed to migrate user ${userId}:`, error)
      throw error
    }
  }

  // Configuration methods
  setPreferSupabase(prefer: boolean) {
    this.config.preferSupabase = prefer
  }

  setFallbackToExisting(fallback: boolean) {
    this.config.fallbackToExisting = fallback
  }

  getConfig() {
    return { ...this.config }
  }
}

// Create singleton instance
export const databaseBridge = new DatabaseBridge()

// Export both the class and instance
export { DatabaseBridge }
export default databaseBridge
