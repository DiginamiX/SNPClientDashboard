import { createClient } from '@supabase/supabase-js';
import type { IStorage } from './storage';
import {
  type User, type InsertUser,
  type Client, type InsertClient,
  type Coach, type InsertCoach,
  type WeightLog, type InsertWeightLog,
  type ProgressPhoto, type InsertProgressPhoto,
  type Checkin, type InsertCheckin,
  type Message, type InsertMessage,
  type NutritionPlan, type InsertNutritionPlan,
  type DeviceIntegration, type InsertDeviceIntegration,
  type Exercise, type InsertExercise,
  type ExerciseCategory, type InsertExerciseCategory,
  type Program, type InsertProgram,
  type Workout, type InsertWorkout,
  type ClientProgram, type InsertClientProgram,
  type WorkoutLog, type InsertWorkoutLog,
  type ExerciseLog, type InsertExerciseLog
} from "@shared/schema";

/**
 * RLS-AWARE STORAGE IMPLEMENTATION
 * 
 * This storage layer enforces Row Level Security by using Supabase client
 * with proper JWT tokens, ensuring data isolation between tenants.
 * 
 * Unlike the direct Drizzle connection, this respects RLS policies.
 */
export class SupabaseStorage implements IStorage {
  private supabase;

  constructor(userToken?: string) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set');
    }

    // Create Supabase client with user context for RLS enforcement
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: userToken ? {
          Authorization: `Bearer ${userToken}`
        } : {}
      }
    });
  }

  // Static method to create RLS-aware storage with user token
  static withUserToken(token: string): SupabaseStorage {
    return new SupabaseStorage(token);
  }

  /**
   * DEEP RECURSIVE FIELD MAPPING UTILITIES
   * 
   * Convert between camelCase (application) and snake_case (database)
   * with complete recursive handling of nested objects, arrays, and edge cases
   */
  
  // Convert camelCase to snake_case
  private snakeKey(key: string): string {
    return key.replace(/([A-Z])/g, "_$1").toLowerCase();
  }

  // Convert snake_case to camelCase
  private camelKey(key: string): string {
    return key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
  }

  // Check if value is a plain object (not array, Date, etc)
  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && 
           typeof value === 'object' && 
           !Array.isArray(value) && 
           !(value instanceof Date);
  }

  // Recursively map keys in nested structures
  private mapKeysDeep(input: unknown, keyTransformer: (key: string) => string): unknown {
    if (input === null || input === undefined) {
      return input;
    }

    if (Array.isArray(input)) {
      return input.map(item => this.mapKeysDeep(item, keyTransformer));
    }

    if (this.isPlainObject(input)) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input)) {
        const transformedKey = keyTransformer(key);
        result[transformedKey] = this.mapKeysDeep(value, keyTransformer);
      }
      return result;
    }

    // Return primitives, dates, and other non-object types unchanged
    return input;
  }

  // Convert application data to database format (camelCase → snake_case)
  private toDb<T>(data: T): T {
    return this.mapKeysDeep(data, this.snakeKey.bind(this)) as T;
  }

  // Convert database data to application format (snake_case → camelCase)
  private fromDb<T>(data: unknown): T {
    return this.mapKeysDeep(data, this.camelKey.bind(this)) as T;
  }

  // Convert array of database rows to application format
  private fromDbArray<T>(rows: unknown[]): T[] {
    return rows.map(row => this.fromDb<T>(row));
  }

  // Helper for converting field names in database queries
  private k(field: string): string {
    return this.snakeKey(field);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data ? this.fromDb<User>(data) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data ? this.fromDb<User>(data) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data ? this.fromDb<User>(data) : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .insert(this.toDb(user))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<User>(data);
  }

  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data ? this.fromDb<Client>(data) : undefined;
  }

  async getClientByUserId(userId: string): Promise<Client | undefined> {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq(this.k('userId'), userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data ? this.fromDb<Client>(data) : undefined;
  }

  async getAllClients(): Promise<any[]> {
    // This will be filtered by RLS policies to only show authorized clients
    const { data, error } = await this.supabase
      .from('clients')
      .select(`
        *,
        users!clients_user_id_fkey (
          username,
          email,
          first_name,
          last_name,
          role,
          avatar
        )
      `);

    if (error) throw error;
    return data ? this.fromDbArray<any>(data) : [];
  }

  async createClient(client: InsertClient): Promise<Client> {
    const { data, error } = await this.supabase
      .from('clients')
      .insert(this.toDb(client))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<Client>(data);
  }

  // Coach operations
  async getCoach(id: number): Promise<Coach | undefined> {
    const { data, error } = await this.supabase
      .from('coaches')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data ? this.fromDb<Coach>(data) : undefined;
  }

  async getCoachByUserId(userId: string): Promise<Coach | undefined> {
    const { data, error } = await this.supabase
      .from('coaches')
      .select('*')
      .eq(this.k('userId'), userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data ? this.fromDb<Coach>(data) : undefined;
  }

  async createCoach(coach: InsertCoach): Promise<Coach> {
    const { data, error } = await this.supabase
      .from('coaches')
      .insert(this.toDb(coach))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<Coach>(data);
  }

  // Weight log operations with RLS enforcement
  async createWeightLog(weightLog: InsertWeightLog): Promise<WeightLog> {
    const { data, error } = await this.supabase
      .from('weight_logs')
      .insert(this.toDb(weightLog))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<WeightLog>(data);
  }

  async getWeightLogsByClientId(clientId: number): Promise<WeightLog[]> {
    const { data, error } = await this.supabase
      .from('weight_logs')
      .select('*')
      .eq(this.k('clientId'), clientId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data ? this.fromDbArray<WeightLog>(data) : [];
  }

  async getWeightLogsByClientIdAndDateRange(clientId: number, startDate: Date, endDate: Date): Promise<WeightLog[]> {
    const { data, error } = await this.supabase
      .from('weight_logs')
      .select('*')
      .eq(this.k('clientId'), clientId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;
    return data ? this.fromDbArray<WeightLog>(data) : [];
  }

  // Progress photo operations
  async createProgressPhoto(progressPhoto: InsertProgressPhoto): Promise<ProgressPhoto> {
    const { data, error } = await this.supabase
      .from('progress_photos')
      .insert(this.toDb(progressPhoto))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<ProgressPhoto>(data);
  }

  async getProgressPhotosByClientId(clientId: number): Promise<ProgressPhoto[]> {
    const { data, error } = await this.supabase
      .from('progress_photos')
      .select('*')
      .eq(this.k('clientId'), clientId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data ? this.fromDbArray<ProgressPhoto>(data) : [];
  }

  // Check-in operations
  async createCheckin(checkin: InsertCheckin): Promise<Checkin> {
    const { data, error } = await this.supabase
      .from('checkins')
      .insert(this.toDb(checkin))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<Checkin>(data);
  }

  async getCheckinsByClientId(clientId: number): Promise<Checkin[]> {
    const { data, error } = await this.supabase
      .from('checkins')
      .select('*')
      .eq(this.k('clientId'), clientId)
      .order('date', { ascending: true });

    if (error) throw error;
    return data ? this.fromDbArray<Checkin>(data) : [];
  }

  async getUpcomingCheckinsByClientId(clientId: number): Promise<Checkin[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await this.supabase
      .from('checkins')
      .select('*')
      .eq(this.k('clientId'), clientId)
      .gte('date', today)
      .order('date', { ascending: true });

    if (error) throw error;
    return data ? this.fromDbArray<Checkin>(data) : [];
  }

  async updateCheckinStatus(id: number, status: string): Promise<Checkin> {
    const { data, error } = await this.supabase
      .from('checkins')
      .update(this.toDb({ status }))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<Checkin>(data);
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const { data, error } = await this.supabase
      .from('messages')
      .insert(this.toDb(message))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<Message>(data);
  }

  async getMessagesByUserId(userId: string): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .or(`${this.k('senderId')}.eq.${userId},${this.k('receiverId')}.eq.${userId}`)
      .order(this.k('createdAt'), { ascending: false });

    if (error) throw error;
    return data ? this.fromDbArray<Message>(data) : [];
  }

  async getConversation(user1Id: string, user2Id: string): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .or(`and(${this.k('senderId')}.eq.${user1Id},${this.k('receiverId')}.eq.${user2Id}),and(${this.k('senderId')}.eq.${user2Id},${this.k('receiverId')}.eq.${user1Id})`)
      .order(this.k('createdAt'), { ascending: true });

    if (error) throw error;
    return data ? this.fromDbArray<Message>(data) : [];
  }

  async markMessageAsRead(id: number): Promise<Message> {
    const { data, error } = await this.supabase
      .from('messages')
      .update(this.toDb({ isRead: true }))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<Message>(data);
  }

  // Nutrition plan operations 
  async createNutritionPlan(nutritionPlan: InsertNutritionPlan): Promise<NutritionPlan> {
    const { data, error } = await this.supabase
      .from('nutrition_plans')
      .insert(this.toDb(nutritionPlan))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<NutritionPlan>(data);
  }

  async getNutritionPlansByClientId(clientId: number): Promise<NutritionPlan[]> {
    const { data, error } = await this.supabase
      .from('nutrition_plans')
      .select('*')
      .eq(this.k('clientId'), clientId);

    if (error) throw error;
    return data ? this.fromDbArray<NutritionPlan>(data) : [];
  }

  async getCurrentNutritionPlan(clientId: number): Promise<NutritionPlan | undefined> {
    const { data, error } = await this.supabase
      .from('nutrition_plans')
      .select('*')
      .eq(this.k('clientId'), clientId)
      .eq(this.k('isActive'), true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data ? this.fromDb<NutritionPlan>(data) : undefined;
  }

  // Device integration operations
  async createDeviceIntegration(integration: InsertDeviceIntegration): Promise<DeviceIntegration> {
    const { data, error } = await this.supabase
      .from('device_integrations')
      .insert(this.toDb(integration))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<DeviceIntegration>(data);
  }

  async getDeviceIntegrationByUserId(userId: string, provider: string): Promise<DeviceIntegration | undefined> {
    const { data, error } = await this.supabase
      .from('device_integrations')
      .select('*')
      .eq(this.k('userId'), userId)
      .eq('provider', provider)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data ? this.fromDb<DeviceIntegration>(data) : undefined;
  }

  async getDeviceIntegrationsByUserId(userId: string): Promise<DeviceIntegration[]> {
    const { data, error } = await this.supabase
      .from('device_integrations')
      .select('*')
      .eq(this.k('userId'), userId);

    if (error) throw error;
    return data ? this.fromDbArray<DeviceIntegration>(data) : [];
  }

  async updateDeviceIntegration(id: number, data: Partial<InsertDeviceIntegration>): Promise<DeviceIntegration> {
    const { data: result, error } = await this.supabase
      .from('device_integrations')
      .update(this.toDb(data))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<DeviceIntegration>(result);
  }

  async deleteDeviceIntegration(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('device_integrations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update(this.toDb({ 
        resetToken: token, 
        resetTokenExpiry: expiry.toISOString() 
      }))
      .eq('id', userId);

    if (error) throw error;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq(this.k('resetToken'), token)
      .gt(this.k('resetTokenExpiry'), new Date().toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data ? this.fromDb<User>(data) : undefined;
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update(this.toDb({ password: hashedPassword }))
      .eq('id', userId);

    if (error) throw error;
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update(this.toDb({ resetToken: null, resetTokenExpiry: null }))
      .eq('id', userId);

    if (error) throw error;
  }

  // Exercise operations
  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const { data, error } = await this.supabase
      .from('exercises')
      .insert(this.toDb(exercise))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<Exercise>(data);
  }

  async getExercises(): Promise<Exercise[]> {
    const { data, error } = await this.supabase
      .from('exercises')
      .select('*');

    if (error) throw error;
    return data ? this.fromDbArray<Exercise>(data) : [];
  }

  async getExercise(id: number): Promise<Exercise | undefined> {
    const { data, error } = await this.supabase
      .from('exercises')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data ? this.fromDb<Exercise>(data) : undefined;
  }

  async updateExercise(id: number, exercise: Partial<InsertExercise>): Promise<Exercise> {
    const { data, error } = await this.supabase
      .from('exercises')
      .update(this.toDb(exercise))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<Exercise>(data);
  }

  async deleteExercise(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('exercises')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Exercise category operations
  async createExerciseCategory(category: InsertExerciseCategory): Promise<ExerciseCategory> {
    const { data, error } = await this.supabase
      .from('exercise_categories')
      .insert(this.toDb(category))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<ExerciseCategory>(data);
  }

  async getExerciseCategories(): Promise<ExerciseCategory[]> {
    const { data, error } = await this.supabase
      .from('exercise_categories')
      .select('*')
      .order(this.k('orderIndex'))
      .order(this.k('name'));

    if (error) throw error;
    return data ? this.fromDbArray<ExerciseCategory>(data) : [];
  }

  async getExerciseCategory(id: number): Promise<ExerciseCategory | undefined> {
    const { data, error } = await this.supabase
      .from('exercise_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data ? this.fromDb<ExerciseCategory>(data) : undefined;
  }

  async updateExerciseCategory(id: number, category: Partial<InsertExerciseCategory>): Promise<ExerciseCategory> {
    const { data, error } = await this.supabase
      .from('exercise_categories')
      .update(this.toDb(category))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<ExerciseCategory>(data);
  }

  async deleteExerciseCategory(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('exercise_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Program operations
  async createProgram(program: InsertProgram): Promise<Program> {
    const { data, error } = await this.supabase
      .from('programs')
      .insert(this.toDb(program))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<Program>(data);
  }

  async getPrograms(): Promise<Program[]> {
    const { data, error } = await this.supabase
      .from('programs')
      .select('*');

    if (error) throw error;
    return data ? this.fromDbArray<Program>(data) : [];
  }

  async getProgramsByCoachId(coachId: number): Promise<Program[]> {
    const { data, error } = await this.supabase
      .from('programs')
      .select('*')
      .eq(this.k('coachId'), coachId);

    if (error) throw error;
    return data ? this.fromDbArray<Program>(data) : [];
  }

  async getProgram(id: number): Promise<Program | undefined> {
    const { data, error } = await this.supabase
      .from('programs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data ? this.fromDb<Program>(data) : undefined;
  }

  async updateProgram(id: number, program: Partial<InsertProgram>): Promise<Program> {
    const { data, error } = await this.supabase
      .from('programs')
      .update(this.toDb(program))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<Program>(data);
  }

  async deleteProgram(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('programs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Workout operations
  async createWorkout(workout: InsertWorkout): Promise<Workout> {
    const { data, error } = await this.supabase
      .from('workouts')
      .insert(this.toDb(workout))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<Workout>(data);
  }

  async getWorkouts(): Promise<Workout[]> {
    const { data, error } = await this.supabase
      .from('workouts')
      .select('*');

    if (error) throw error;
    return data ? this.fromDbArray<Workout>(data) : [];
  }

  async getWorkoutsByProgramId(programId: number): Promise<Workout[]> {
    const { data, error } = await this.supabase
      .from('workouts')
      .select('*')
      .eq(this.k('programId'), programId);

    if (error) throw error;
    return data ? this.fromDbArray<Workout>(data) : [];
  }

  async getWorkout(id: number): Promise<Workout | undefined> {
    const { data, error } = await this.supabase
      .from('workouts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data ? this.fromDb<Workout>(data) : undefined;
  }

  async updateWorkout(id: number, workout: Partial<InsertWorkout>): Promise<Workout> {
    const { data, error } = await this.supabase
      .from('workouts')
      .update(this.toDb(workout))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<Workout>(data);
  }

  async deleteWorkout(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('workouts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Workout exercise operations
  async createWorkoutExercise(workoutExercise: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('workout_exercises')
      .insert(this.toDb(workoutExercise))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<any>(data);
  }

  async getWorkoutExercisesByWorkoutId(workoutId: number): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('workout_exercises')
      .select('*')
      .eq(this.k('workoutId'), workoutId);

    if (error) throw error;
    return data ? this.fromDbArray<any>(data) : [];
  }

  async deleteWorkoutExercisesByWorkoutId(workoutId: number): Promise<void> {
    const { error } = await this.supabase
      .from('workout_exercises')
      .delete()
      .eq(this.k('workoutId'), workoutId);

    if (error) throw error;
  }

  // Client program operations
  async assignProgramToClient(clientProgram: InsertClientProgram): Promise<ClientProgram> {
    const { data, error } = await this.supabase
      .from('client_programs')
      .insert(this.toDb(clientProgram))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<ClientProgram>(data);
  }

  async getClientPrograms(clientId: number): Promise<ClientProgram[]> {
    const { data, error } = await this.supabase
      .from('client_programs')
      .select('*')
      .eq(this.k('clientId'), clientId);

    if (error) throw error;
    return data ? this.fromDbArray<ClientProgram>(data) : [];
  }

  async getClientProgramsByCoachId(coachId: string): Promise<ClientProgram[]> {
    const { data, error } = await this.supabase
      .from('client_programs')
      .select('*')
      .eq(this.k('assignedBy'), coachId);

    if (error) throw error;
    return data ? this.fromDbArray<ClientProgram>(data) : [];
  }

  async updateClientProgramStatus(id: number, status: string): Promise<ClientProgram> {
    const { data, error } = await this.supabase
      .from('client_programs')
      .update(this.toDb({ status }))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<ClientProgram>(data);
  }

  // Workout log operations
  async createWorkoutLog(workoutLog: InsertWorkoutLog): Promise<WorkoutLog> {
    const { data, error } = await this.supabase
      .from('workout_logs')
      .insert(this.toDb(workoutLog))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<WorkoutLog>(data);
  }

  async getWorkoutLogsByClientId(clientId: number): Promise<WorkoutLog[]> {
    const { data, error } = await this.supabase
      .from('workout_logs')
      .select('*')
      .eq(this.k('clientId'), clientId);

    if (error) throw error;
    return data ? this.fromDbArray<WorkoutLog>(data) : [];
  }

  async updateWorkoutLog(id: number, workoutLog: Partial<InsertWorkoutLog>): Promise<WorkoutLog> {
    const { data, error } = await this.supabase
      .from('workout_logs')
      .update(this.toDb(workoutLog))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<WorkoutLog>(data);
  }

  // Exercise log operations
  async createExerciseLog(exerciseLog: InsertExerciseLog): Promise<ExerciseLog> {
    const { data, error } = await this.supabase
      .from('exercise_logs')
      .insert(this.toDb(exerciseLog))
      .select()
      .single();

    if (error) throw error;
    return this.fromDb<ExerciseLog>(data);
  }

  async getExerciseLogsByWorkoutLogId(workoutLogId: number): Promise<ExerciseLog[]> {
    const { data, error } = await this.supabase
      .from('exercise_logs')
      .select('*')
      .eq(this.k('workoutLogId'), workoutLogId);

    if (error) throw error;
    return data ? this.fromDbArray<ExerciseLog>(data) : [];
  }
}