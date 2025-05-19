import { 
  users, type User, type InsertUser,
  clients, type Client, type InsertClient,
  coaches, type Coach, type InsertCoach,
  weightLogs, type WeightLog, type InsertWeightLog,
  progressPhotos, type ProgressPhoto, type InsertProgressPhoto,
  checkins, type Checkin, type InsertCheckin,
  messages, type Message, type InsertMessage,
  nutritionPlans, type NutritionPlan, type InsertNutritionPlan
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

// Modify the interface with all the required CRUD methods
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Client operations
  getClient(id: number): Promise<Client | undefined>;
  getClientByUserId(userId: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  
  // Coach operations
  getCoach(id: number): Promise<Coach | undefined>;
  getCoachByUserId(userId: number): Promise<Coach | undefined>;
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
  getMessagesByUserId(userId: number): Promise<Message[]>;
  getConversation(user1Id: number, user2Id: number): Promise<Message[]>;
  markMessageAsRead(id: number): Promise<Message>;
  
  // Nutrition plan operations
  createNutritionPlan(nutritionPlan: InsertNutritionPlan): Promise<NutritionPlan>;
  getNutritionPlansByClientId(clientId: number): Promise<NutritionPlan[]>;
  getCurrentNutritionPlan(clientId: number): Promise<NutritionPlan | undefined>;

  // Device integration operations
  createDeviceIntegration(integration: InsertDeviceIntegration): Promise<DeviceIntegration>;
  getDeviceIntegrationByUserId(userId: number, provider: string): Promise<DeviceIntegration | undefined>;
  getDeviceIntegrationsByUserId(userId: number): Promise<DeviceIntegration[]>;
  updateDeviceIntegration(id: number, data: Partial<InsertDeviceIntegration>): Promise<DeviceIntegration>;
  deleteDeviceIntegration(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
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

  async getClientByUserId(userId: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.userId, userId));
    return client;
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

  async getCoachByUserId(userId: number): Promise<Coach | undefined> {
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
          gte(weightLogs.date, startDate),
          lte(weightLogs.date, endDate)
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
    const today = new Date();
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

  async getMessagesByUserId(userId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(
        sql`${messages.senderId} = ${userId} OR ${messages.receiverId} = ${userId}`
      )
      .orderBy(desc(messages.createdAt));
  }

  async getConversation(user1Id: number, user2Id: number): Promise<Message[]> {
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
}

export const storage = new DatabaseStorage();
