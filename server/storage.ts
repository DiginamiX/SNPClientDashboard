import { 
  users, type User, type InsertUser,
  clients, type Client, type InsertClient,
  coaches, type Coach, type InsertCoach,
  weightLogs, type WeightLog, type InsertWeightLog,
  progressPhotos, type ProgressPhoto, type InsertProgressPhoto,
  checkins, type Checkin, type InsertCheckin,
  messages, type Message, type InsertMessage,
  nutritionPlans, type NutritionPlan, type InsertNutritionPlan,
  deviceIntegrations, type DeviceIntegration, type InsertDeviceIntegration,
  exercises, type Exercise, type InsertExercise,
  exerciseCategories, type ExerciseCategory, type InsertExerciseCategory,
  programs, type Program, type InsertProgram,
  workouts, type Workout, type InsertWorkout,
  workoutExercises, type InsertWorkoutExercise,
  clientPrograms, type ClientProgram, type InsertClientProgram,
  workoutLogs, type WorkoutLog, type InsertWorkoutLog,
  exerciseLogs, type ExerciseLog, type InsertExerciseLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

// Modify the interface with all the required CRUD methods
export interface IStorage {
  // User operations  
  getUser(id: string): Promise<User | undefined>; // Fixed: Changed from number to string for UUID
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Client operations
  getClient(id: number): Promise<Client | undefined>; // Keep number for client.id (serial)
  getClientByUserId(userId: string): Promise<Client | undefined>; // Fixed: Changed to string for user UUID
  getAllClients(): Promise<any[]>; // Added missing method
  createClient(client: InsertClient): Promise<Client>;
  
  // Coach operations
  getCoach(id: number): Promise<Coach | undefined>; // Keep number for coach.id (serial)
  getCoachByUserId(userId: string): Promise<Coach | undefined>; // Fixed: Changed to string for user UUID
  createCoach(coach: InsertCoach): Promise<Coach>;
  
  // Weight log operations
  createWeightLog(weightLog: InsertWeightLog): Promise<WeightLog>;
  getWeightLogsByClientId(clientId: number): Promise<WeightLog[]>;
  getWeightLogsByClientIdAndDateRange(clientId: number, startDate: Date, endDate: Date): Promise<WeightLog[]>;
  
  // Progress photo operations
  createProgressPhoto(progressPhoto: InsertProgressPhoto): Promise<ProgressPhoto>;
  getProgressPhotosByClientId(clientId: number): Promise<ProgressPhoto[]>;
  
  // Check-in operations
  createCheckin(checkin: InsertCheckin): Promise<Checkin>;
  getCheckinsByClientId(clientId: number): Promise<Checkin[]>;
  getUpcomingCheckinsByClientId(clientId: number): Promise<Checkin[]>;
  updateCheckinStatus(id: number, status: string): Promise<Checkin>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByUserId(userId: string): Promise<Message[]>;
  getConversation(user1Id: string, user2Id: string): Promise<Message[]>;
  markMessageAsRead(id: number): Promise<Message>;
  
  // Nutrition plan operations
  createNutritionPlan(nutritionPlan: InsertNutritionPlan): Promise<NutritionPlan>;
  getNutritionPlansByClientId(clientId: number): Promise<NutritionPlan[]>;
  getCurrentNutritionPlan(clientId: number): Promise<NutritionPlan | undefined>;

  // Device integration operations
  createDeviceIntegration(integration: InsertDeviceIntegration): Promise<DeviceIntegration>;
  getDeviceIntegrationByUserId(userId: string, provider: string): Promise<DeviceIntegration | undefined>;
  getDeviceIntegrationsByUserId(userId: string): Promise<DeviceIntegration[]>;
  updateDeviceIntegration(id: number, data: Partial<InsertDeviceIntegration>): Promise<DeviceIntegration>;
  deleteDeviceIntegration(id: number): Promise<void>;
  
  // Password reset operations
  setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
  clearPasswordResetToken(userId: string): Promise<void>;

  // Exercise operations
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  getExercises(): Promise<Exercise[]>;
  getExercise(id: number): Promise<Exercise | undefined>;
  updateExercise(id: number, exercise: Partial<InsertExercise>): Promise<Exercise>;
  deleteExercise(id: number): Promise<void>;

  // Exercise category operations
  createExerciseCategory(category: InsertExerciseCategory): Promise<ExerciseCategory>;
  getExerciseCategories(): Promise<ExerciseCategory[]>;
  getExerciseCategory(id: number): Promise<ExerciseCategory | undefined>;
  updateExerciseCategory(id: number, category: Partial<InsertExerciseCategory>): Promise<ExerciseCategory>;
  deleteExerciseCategory(id: number): Promise<void>;

  // Program operations
  createProgram(program: InsertProgram): Promise<Program>;
  getPrograms(): Promise<Program[]>;
  getProgramsByCoachId(coachId: number): Promise<Program[]>;
  getProgram(id: number): Promise<Program | undefined>;
  updateProgram(id: number, program: Partial<InsertProgram>): Promise<Program>;
  deleteProgram(id: number): Promise<void>;

  // Workout operations
  createWorkout(workout: InsertWorkout): Promise<Workout>;
  getWorkouts(): Promise<Workout[]>;
  getWorkoutsByProgramId(programId: number): Promise<Workout[]>;
  getWorkout(id: number): Promise<Workout | undefined>;
  updateWorkout(id: number, workout: Partial<InsertWorkout>): Promise<Workout>;
  deleteWorkout(id: number): Promise<void>;

  // Workout exercise operations
  createWorkoutExercise(workoutExercise: InsertWorkoutExercise): Promise<any>;
  getWorkoutExercisesByWorkoutId(workoutId: number): Promise<any[]>;
  deleteWorkoutExercisesByWorkoutId(workoutId: number): Promise<void>;

  // Client program operations
  assignProgramToClient(clientProgram: InsertClientProgram): Promise<ClientProgram>;
  getClientPrograms(clientId: number): Promise<ClientProgram[]>;
  getClientProgramsByCoachId(coachId: string): Promise<ClientProgram[]>;
  updateClientProgramStatus(id: number, status: string): Promise<ClientProgram>;

  // Workout log operations
  createWorkoutLog(workoutLog: InsertWorkoutLog): Promise<WorkoutLog>;
  getWorkoutLogsByClientId(clientId: number): Promise<WorkoutLog[]>;
  updateWorkoutLog(id: number, workoutLog: Partial<InsertWorkoutLog>): Promise<WorkoutLog>;

  // Exercise log operations
  createExerciseLog(exerciseLog: InsertExerciseLog): Promise<ExerciseLog>;
  getExerciseLogsByWorkoutLogId(workoutLogId: number): Promise<ExerciseLog[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> { // Fixed: Changed parameter type to string
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientByUserId(userId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.userId, userId));
    return client;
  }

  async getAllClients(): Promise<any[]> {
    const clientsWithUsers = await db
      .select({
        id: clients.id,
        userId: clients.userId,
        phone: clients.phone,
        packageType: clients.packageType,
        goals: clients.goals,
        notes: clients.notes,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
        // User details
        userName: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        avatar: users.avatar
      })
      .from(clients)
      .leftJoin(users, eq(clients.userId, users.id));
    
    return clientsWithUsers;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values(insertClient)
      .returning();
    return client;
  }

  // Coach operations
  async getCoach(id: number): Promise<Coach | undefined> {
    const [coach] = await db.select().from(coaches).where(eq(coaches.id, id));
    return coach;
  }

  async getCoachByUserId(userId: string): Promise<Coach | undefined> {
    const [coach] = await db.select().from(coaches).where(eq(coaches.userId, userId));
    return coach;
  }

  async createCoach(insertCoach: InsertCoach): Promise<Coach> {
    const [coach] = await db
      .insert(coaches)
      .values(insertCoach)
      .returning();
    return coach;
  }

  // Weight log operations
  async createWeightLog(insertWeightLog: InsertWeightLog): Promise<WeightLog> {
    const [weightLog] = await db
      .insert(weightLogs)
      .values(insertWeightLog)
      .returning();
    return weightLog;
  }

  async getWeightLogsByClientId(clientId: number): Promise<WeightLog[]> {
    return db
      .select()
      .from(weightLogs)
      .where(eq(weightLogs.clientId, clientId))
      .orderBy(desc(weightLogs.date));
  }

  async getWeightLogsByClientIdAndDateRange(clientId: number, startDate: Date, endDate: Date): Promise<WeightLog[]> {
    return db
      .select()
      .from(weightLogs)
      .where(
        and(
          eq(weightLogs.clientId, clientId),
          gte(weightLogs.date, startDate.toISOString().split('T')[0]),
          lte(weightLogs.date, endDate.toISOString().split('T')[0])
        )
      )
      .orderBy(weightLogs.date);
  }

  // Progress photo operations
  async createProgressPhoto(insertProgressPhoto: InsertProgressPhoto): Promise<ProgressPhoto> {
    const [progressPhoto] = await db
      .insert(progressPhotos)
      .values(insertProgressPhoto)
      .returning();
    return progressPhoto;
  }

  async getProgressPhotosByClientId(clientId: number): Promise<ProgressPhoto[]> {
    return db
      .select()
      .from(progressPhotos)
      .where(eq(progressPhotos.clientId, clientId))
      .orderBy(desc(progressPhotos.date));
  }

  // Check-in operations
  async createCheckin(insertCheckin: InsertCheckin): Promise<Checkin> {
    const [checkin] = await db
      .insert(checkins)
      .values(insertCheckin)
      .returning();
    return checkin;
  }

  async getCheckinsByClientId(clientId: number): Promise<Checkin[]> {
    return db
      .select()
      .from(checkins)
      .where(eq(checkins.clientId, clientId))
      .orderBy(checkins.date);
  }

  async getUpcomingCheckinsByClientId(clientId: number): Promise<Checkin[]> {
    const today = new Date().toISOString().split('T')[0];
    return db
      .select()
      .from(checkins)
      .where(
        and(
          eq(checkins.clientId, clientId),
          gte(checkins.date, today)
        )
      )
      .orderBy(checkins.date);
  }

  async updateCheckinStatus(id: number, status: string): Promise<Checkin> {
    const [checkin] = await db
      .update(checkins)
      .set({ status: status as any })
      .where(eq(checkins.id, id))
      .returning();
    return checkin;
  }

  // Message operations
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getMessagesByUserId(userId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(
        sql`${messages.senderId} = ${userId} OR ${messages.receiverId} = ${userId}`
      )
      .orderBy(desc(messages.createdAt));
  }

  async getConversation(user1Id: string, user2Id: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(
        sql`(${messages.senderId} = ${user1Id} AND ${messages.receiverId} = ${user2Id}) OR 
            (${messages.senderId} = ${user2Id} AND ${messages.receiverId} = ${user1Id})`
      )
      .orderBy(messages.createdAt);
  }

  async markMessageAsRead(id: number): Promise<Message> {
    const [message] = await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, id))
      .returning();
    return message;
  }

  // Nutrition plan operations
  async createNutritionPlan(insertNutritionPlan: InsertNutritionPlan): Promise<NutritionPlan> {
    const [nutritionPlan] = await db
      .insert(nutritionPlans)
      .values(insertNutritionPlan)
      .returning();
    return nutritionPlan;
  }

  async getNutritionPlansByClientId(clientId: number): Promise<NutritionPlan[]> {
    return db
      .select()
      .from(nutritionPlans)
      .where(eq(nutritionPlans.clientId, clientId))
      .orderBy(desc(nutritionPlans.createdAt));
  }

  async getCurrentNutritionPlan(clientId: number): Promise<NutritionPlan | undefined> {
    const [nutritionPlan] = await db
      .select()
      .from(nutritionPlans)
      .where(
        and(
          eq(nutritionPlans.clientId, clientId),
          eq(nutritionPlans.isActive, true)
        )
      )
      .orderBy(desc(nutritionPlans.createdAt));
    return nutritionPlan;
  }

  // Device integration operations
  async createDeviceIntegration(integration: InsertDeviceIntegration): Promise<DeviceIntegration> {
    const [createdIntegration] = await db
      .insert(deviceIntegrations)
      .values(integration)
      .returning();
    
    return createdIntegration;
  }

  async getDeviceIntegrationByUserId(userId: string, provider: string): Promise<DeviceIntegration | undefined> {
    const [integration] = await db
      .select()
      .from(deviceIntegrations)
      .where(
        and(
          eq(deviceIntegrations.userId, userId),
          eq(deviceIntegrations.provider, provider)
        )
      );
    
    return integration;
  }

  async getDeviceIntegrationsByUserId(userId: string): Promise<DeviceIntegration[]> {
    return db
      .select()
      .from(deviceIntegrations)
      .where(eq(deviceIntegrations.userId, userId));
  }

  async updateDeviceIntegration(id: number, data: Partial<InsertDeviceIntegration>): Promise<DeviceIntegration> {
    const [updatedIntegration] = await db
      .update(deviceIntegrations)
      .set(data)
      .where(eq(deviceIntegrations.id, id))
      .returning();
    
    return updatedIntegration;
  }

  async deleteDeviceIntegration(id: number): Promise<void> {
    await db
      .delete(deviceIntegrations)
      .where(eq(deviceIntegrations.id, id));
  }
  
  // Password reset operations
  async setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({ 
        resetToken: token, 
        resetTokenExpiry: expiry 
      })
      .where(eq(users.id, userId));
  }
  
  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.resetToken, token),
          gte(users.resetTokenExpiry, new Date())
        )
      );
    return user;
  }
  
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }
  
  async clearPasswordResetToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        resetToken: null, 
        resetTokenExpiry: null 
      })
      .where(eq(users.id, userId));
  }

  // Exercise operations
  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const [created] = await db.insert(exercises).values(exercise).returning();
    return created;
  }

  async getExercises(): Promise<Exercise[]> {
    return db.select().from(exercises).orderBy(exercises.name);
  }

  async getExercise(id: number): Promise<Exercise | undefined> {
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    return exercise;
  }

  async updateExercise(id: number, exercise: Partial<InsertExercise>): Promise<Exercise> {
    const [updated] = await db
      .update(exercises)
      .set(exercise)
      .where(eq(exercises.id, id))
      .returning();
    return updated;
  }

  async deleteExercise(id: number): Promise<void> {
    await db.delete(exercises).where(eq(exercises.id, id));
  }

  // Exercise category operations
  async createExerciseCategory(category: InsertExerciseCategory): Promise<ExerciseCategory> {
    const [created] = await db.insert(exerciseCategories).values(category).returning();
    return created;
  }

  async getExerciseCategories(): Promise<ExerciseCategory[]> {
    return db.select().from(exerciseCategories).orderBy(exerciseCategories.orderIndex, exerciseCategories.name);
  }

  async getExerciseCategory(id: number): Promise<ExerciseCategory | undefined> {
    const [category] = await db.select().from(exerciseCategories).where(eq(exerciseCategories.id, id));
    return category;
  }

  async updateExerciseCategory(id: number, category: Partial<InsertExerciseCategory>): Promise<ExerciseCategory> {
    const [updated] = await db
      .update(exerciseCategories)
      .set(category)
      .where(eq(exerciseCategories.id, id))
      .returning();
    return updated;
  }

  async deleteExerciseCategory(id: number): Promise<void> {
    await db.delete(exerciseCategories).where(eq(exerciseCategories.id, id));
  }

  // Program operations
  async createProgram(program: InsertProgram): Promise<Program> {
    const [created] = await db.insert(programs).values(program).returning();
    return created;
  }

  async getPrograms(): Promise<Program[]> {
    return db.select().from(programs).orderBy(programs.name);
  }

  async getProgramsByCoachId(coachId: number): Promise<Program[]> {
    return db.select().from(programs).where(eq(programs.coachId, coachId)).orderBy(programs.name);
  }

  async getProgram(id: number): Promise<Program | undefined> {
    const [program] = await db.select().from(programs).where(eq(programs.id, id));
    return program;
  }

  async updateProgram(id: number, program: Partial<InsertProgram>): Promise<Program> {
    const [updated] = await db
      .update(programs)
      .set(program)
      .where(eq(programs.id, id))
      .returning();
    return updated;
  }

  async deleteProgram(id: number): Promise<void> {
    await db.delete(programs).where(eq(programs.id, id));
  }

  // Workout operations
  async createWorkout(workout: InsertWorkout): Promise<Workout> {
    const [created] = await db.insert(workouts).values(workout).returning();
    return created;
  }

  async getWorkouts(): Promise<Workout[]> {
    return db.select().from(workouts).orderBy(workouts.name);
  }

  async getWorkoutsByProgramId(programId: number): Promise<Workout[]> {
    return db.select().from(workouts).where(eq(workouts.programId, programId)).orderBy(workouts.dayNumber);
  }

  async getWorkout(id: number): Promise<Workout | undefined> {
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    return workout;
  }

  async updateWorkout(id: number, workout: Partial<InsertWorkout>): Promise<Workout> {
    const [updated] = await db
      .update(workouts)
      .set(workout)
      .where(eq(workouts.id, id))
      .returning();
    return updated;
  }

  async deleteWorkout(id: number): Promise<void> {
    await db.delete(workouts).where(eq(workouts.id, id));
  }

  // Workout exercise operations
  async createWorkoutExercise(workoutExercise: InsertWorkoutExercise): Promise<any> {
    const [created] = await db.insert(workoutExercises).values(workoutExercise).returning();
    return created;
  }

  async getWorkoutExercisesByWorkoutId(workoutId: number): Promise<any[]> {
    return db.select().from(workoutExercises).where(eq(workoutExercises.workoutId, workoutId)).orderBy(workoutExercises.orderIndex);
  }

  async deleteWorkoutExercisesByWorkoutId(workoutId: number): Promise<void> {
    await db.delete(workoutExercises).where(eq(workoutExercises.workoutId, workoutId));
  }

  // Client program operations
  async assignProgramToClient(clientProgram: InsertClientProgram): Promise<ClientProgram> {
    const [created] = await db.insert(clientPrograms).values(clientProgram).returning();
    return created;
  }

  async getClientPrograms(clientId: number): Promise<ClientProgram[]> {
    return db.select().from(clientPrograms).where(eq(clientPrograms.clientId, clientId)).orderBy(desc(clientPrograms.startDate));
  }

  async getClientProgramsByCoachId(coachId: string): Promise<ClientProgram[]> {
    return db.select().from(clientPrograms).where(eq(clientPrograms.assignedBy, coachId)).orderBy(desc(clientPrograms.startDate));
  }

  async updateClientProgramStatus(id: number, status: string): Promise<ClientProgram> {
    const [updated] = await db
      .update(clientPrograms)
      .set({ status: status as any })
      .where(eq(clientPrograms.id, id))
      .returning();
    return updated;
  }

  // Workout log operations
  async createWorkoutLog(workoutLog: InsertWorkoutLog): Promise<WorkoutLog> {
    const [created] = await db.insert(workoutLogs).values(workoutLog).returning();
    return created;
  }

  async getWorkoutLogsByClientId(clientId: number): Promise<WorkoutLog[]> {
    return db.select().from(workoutLogs).where(eq(workoutLogs.clientId, clientId)).orderBy(desc(workoutLogs.date));
  }

  async updateWorkoutLog(id: number, workoutLog: Partial<InsertWorkoutLog>): Promise<WorkoutLog> {
    const [updated] = await db
      .update(workoutLogs)
      .set(workoutLog)
      .where(eq(workoutLogs.id, id))
      .returning();
    return updated;
  }

  // Exercise log operations
  async createExerciseLog(exerciseLog: InsertExerciseLog): Promise<ExerciseLog> {
    const [created] = await db.insert(exerciseLogs).values(exerciseLog).returning();
    return created;
  }

  async getExerciseLogsByWorkoutLogId(workoutLogId: number): Promise<ExerciseLog[]> {
    return db.select().from(exerciseLogs).where(eq(exerciseLogs.workoutLogId, workoutLogId)).orderBy(exerciseLogs.orderIndex);
  }
}

export const storage = new DatabaseStorage();
