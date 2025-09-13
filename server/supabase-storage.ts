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
    return data;
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
    return data;
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
    return data;
  }

  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .insert(user)
      .select()
      .single();

    if (error) throw error;
    return data;
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
    return data;
  }

  async getClientByUserId(userId: string): Promise<Client | undefined> {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq('userId', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data;
  }

  async getAllClients(): Promise<any[]> {
    // This will be filtered by RLS policies to only show authorized clients
    const { data, error } = await this.supabase
      .from('clients')
      .select(`
        *,
        users (
          username,
          email,
          firstName,
          lastName,
          role,
          avatar
        )
      `);

    if (error) throw error;
    return data || [];
  }

  async createClient(client: InsertClient): Promise<Client> {
    const { data, error } = await this.supabase
      .from('clients')
      .insert(client)
      .select()
      .single();

    if (error) throw error;
    return data;
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
    return data;
  }

  async getCoachByUserId(userId: string): Promise<Coach | undefined> {
    const { data, error } = await this.supabase
      .from('coaches')
      .select('*')
      .eq('userId', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data;
  }

  async createCoach(coach: InsertCoach): Promise<Coach> {
    const { data, error } = await this.supabase
      .from('coaches')
      .insert(coach)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Weight log operations with RLS enforcement
  async createWeightLog(weightLog: InsertWeightLog): Promise<WeightLog> {
    const { data, error } = await this.supabase
      .from('weight_logs')
      .insert(weightLog)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWeightLogsByClientId(clientId: number): Promise<WeightLog[]> {
    const { data, error } = await this.supabase
      .from('weight_logs')
      .select('*')
      .eq('clientId', clientId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getWeightLogsByClientIdAndDateRange(clientId: number, startDate: Date, endDate: Date): Promise<WeightLog[]> {
    const { data, error } = await this.supabase
      .from('weight_logs')
      .select('*')
      .eq('clientId', clientId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Progress photo operations
  async createProgressPhoto(progressPhoto: InsertProgressPhoto): Promise<ProgressPhoto> {
    const { data, error } = await this.supabase
      .from('progress_photos')
      .insert(progressPhoto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getProgressPhotosByClientId(clientId: number): Promise<ProgressPhoto[]> {
    const { data, error } = await this.supabase
      .from('progress_photos')
      .select('*')
      .eq('clientId', clientId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Check-in operations
  async createCheckin(checkin: InsertCheckin): Promise<Checkin> {
    const { data, error } = await this.supabase
      .from('checkins')
      .insert(checkin)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCheckinsByClientId(clientId: number): Promise<Checkin[]> {
    const { data, error } = await this.supabase
      .from('checkins')
      .select('*')
      .eq('clientId', clientId)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getUpcomingCheckinsByClientId(clientId: number): Promise<Checkin[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await this.supabase
      .from('checkins')
      .select('*')
      .eq('clientId', clientId)
      .gte('date', today)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async updateCheckinStatus(id: number, status: string): Promise<Checkin> {
    const { data, error } = await this.supabase
      .from('checkins')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const { data, error } = await this.supabase
      .from('messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getMessagesByUserId(userId: string): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .or(`senderId.eq.${userId},receiverId.eq.${userId}`)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getConversation(user1Id: string, user2Id: string): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .or(`and(senderId.eq.${user1Id},receiverId.eq.${user2Id}),and(senderId.eq.${user2Id},receiverId.eq.${user1Id})`)
      .order('createdAt', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async markMessageAsRead(id: number): Promise<Message> {
    const { data, error } = await this.supabase
      .from('messages')
      .update({ isRead: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Nutrition plan operations 
  async createNutritionPlan(nutritionPlan: InsertNutritionPlan): Promise<NutritionPlan> {
    const { data, error } = await this.supabase
      .from('nutrition_plans')
      .insert(nutritionPlan)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getNutritionPlansByClientId(clientId: number): Promise<NutritionPlan[]> {
    const { data, error } = await this.supabase
      .from('nutrition_plans')
      .select('*')
      .eq('clientId', clientId);

    if (error) throw error;
    return data || [];
  }

  async getCurrentNutritionPlan(clientId: number): Promise<NutritionPlan | undefined> {
    const { data, error } = await this.supabase
      .from('nutrition_plans')
      .select('*')
      .eq('clientId', clientId)
      .eq('isActive', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data;
  }

  // Device integration operations
  async createDeviceIntegration(integration: InsertDeviceIntegration): Promise<DeviceIntegration> {
    const { data, error } = await this.supabase
      .from('device_integrations')
      .insert(integration)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getDeviceIntegrationByUserId(userId: string, provider: string): Promise<DeviceIntegration | undefined> {
    const { data, error } = await this.supabase
      .from('device_integrations')
      .select('*')
      .eq('userId', userId)
      .eq('provider', provider)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data;
  }

  async getDeviceIntegrationsByUserId(userId: string): Promise<DeviceIntegration[]> {
    const { data, error } = await this.supabase
      .from('device_integrations')
      .select('*')
      .eq('userId', userId);

    if (error) throw error;
    return data || [];
  }

  async updateDeviceIntegration(id: number, data: Partial<InsertDeviceIntegration>): Promise<DeviceIntegration> {
    const { data: result, error } = await this.supabase
      .from('device_integrations')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
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
      .update({ 
        resetToken: token, 
        resetTokenExpiry: expiry.toISOString() 
      })
      .eq('id', userId);

    if (error) throw error;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('resetToken', token)
      .gt('resetTokenExpiry', new Date().toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Row not found
      throw error;
    }
    return data;
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', userId);

    if (error) throw error;
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ resetToken: null, resetTokenExpiry: null })
      .eq('id', userId);

    if (error) throw error;
  }

  // Exercise operations
  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const { data, error } = await this.supabase
      .from('exercises')
      .insert(exercise)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getExercises(): Promise<Exercise[]> {
    const { data, error } = await this.supabase
      .from('exercises')
      .select('*');

    if (error) throw error;
    return data || [];
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
    return data;
  }

  async updateExercise(id: number, exercise: Partial<InsertExercise>): Promise<Exercise> {
    const { data, error } = await this.supabase
      .from('exercises')
      .update(exercise)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteExercise(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('exercises')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Program operations
  async createProgram(program: InsertProgram): Promise<Program> {
    const { data, error } = await this.supabase
      .from('programs')
      .insert(program)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getPrograms(): Promise<Program[]> {
    const { data, error } = await this.supabase
      .from('programs')
      .select('*');

    if (error) throw error;
    return data || [];
  }

  async getProgramsByCoachId(coachId: number): Promise<Program[]> {
    const { data, error } = await this.supabase
      .from('programs')
      .select('*')
      .eq('coachId', coachId);

    if (error) throw error;
    return data || [];
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
    return data;
  }

  async updateProgram(id: number, program: Partial<InsertProgram>): Promise<Program> {
    const { data, error } = await this.supabase
      .from('programs')
      .update(program)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
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
      .insert(workout)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWorkouts(): Promise<Workout[]> {
    const { data, error } = await this.supabase
      .from('workouts')
      .select('*');

    if (error) throw error;
    return data || [];
  }

  async getWorkoutsByProgramId(programId: number): Promise<Workout[]> {
    const { data, error } = await this.supabase
      .from('workouts')
      .select('*')
      .eq('programId', programId);

    if (error) throw error;
    return data || [];
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
    return data;
  }

  async updateWorkout(id: number, workout: Partial<InsertWorkout>): Promise<Workout> {
    const { data, error } = await this.supabase
      .from('workouts')
      .update(workout)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
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
      .insert(workoutExercise)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWorkoutExercisesByWorkoutId(workoutId: number): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('workout_exercises')
      .select('*')
      .eq('workoutId', workoutId);

    if (error) throw error;
    return data || [];
  }

  async deleteWorkoutExercisesByWorkoutId(workoutId: number): Promise<void> {
    const { error } = await this.supabase
      .from('workout_exercises')
      .delete()
      .eq('workoutId', workoutId);

    if (error) throw error;
  }

  // Client program operations
  async assignProgramToClient(clientProgram: InsertClientProgram): Promise<ClientProgram> {
    const { data, error } = await this.supabase
      .from('client_programs')
      .insert(clientProgram)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getClientPrograms(clientId: number): Promise<ClientProgram[]> {
    const { data, error } = await this.supabase
      .from('client_programs')
      .select('*')
      .eq('clientId', clientId);

    if (error) throw error;
    return data || [];
  }

  async getClientProgramsByCoachId(coachId: string): Promise<ClientProgram[]> {
    const { data, error } = await this.supabase
      .from('client_programs')
      .select('*')
      .eq('assignedBy', coachId);

    if (error) throw error;
    return data || [];
  }

  async updateClientProgramStatus(id: number, status: string): Promise<ClientProgram> {
    const { data, error } = await this.supabase
      .from('client_programs')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Workout log operations
  async createWorkoutLog(workoutLog: InsertWorkoutLog): Promise<WorkoutLog> {
    const { data, error } = await this.supabase
      .from('workout_logs')
      .insert(workoutLog)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWorkoutLogsByClientId(clientId: number): Promise<WorkoutLog[]> {
    const { data, error } = await this.supabase
      .from('workout_logs')
      .select('*')
      .eq('clientId', clientId);

    if (error) throw error;
    return data || [];
  }

  async updateWorkoutLog(id: number, workoutLog: Partial<InsertWorkoutLog>): Promise<WorkoutLog> {
    const { data, error } = await this.supabase
      .from('workout_logs')
      .update(workoutLog)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Exercise log operations
  async createExerciseLog(exerciseLog: InsertExerciseLog): Promise<ExerciseLog> {
    const { data, error } = await this.supabase
      .from('exercise_logs')
      .insert(exerciseLog)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getExerciseLogsByWorkoutLogId(workoutLogId: number): Promise<ExerciseLog[]> {
    const { data, error } = await this.supabase
      .from('exercise_logs')
      .select('*')
      .eq('workoutLogId', workoutLogId);

    if (error) throw error;
    return data || [];
  }
}