import { pgTable, text, serial, integer, boolean, timestamp, date, decimal, pgEnum, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['client', 'admin']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").notNull().default('client'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Coaches table
export const coaches = pgTable("coaches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  specialization: text("specialization"),
  bio: text("bio"),
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  coachId: integer("coach_id").references(() => coaches.id),
  height: decimal("height"), // in cm
  startingWeight: decimal("starting_weight"), // in kg/lbs
  goalWeight: decimal("goal_weight"), // in kg/lbs
  dateOfBirth: date("date_of_birth"),
});

// Weight logs table
export const weightLogs = pgTable("weight_logs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  weight: decimal("weight").notNull(), // in kg/lbs
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Progress photos table
export const progressPhotos = pgTable("progress_photos", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  imageUrl: text("image_url").notNull(),
  date: date("date").notNull(),
  category: text("category"), // e.g., "front", "side", "back"
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Check-in statuses enum
export const checkinStatusEnum = pgEnum('checkin_status', ['scheduled', 'confirmed', 'completed', 'cancelled']);

// Check-ins table
export const checkins = pgTable("checkins", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  coachId: integer("coach_id").notNull().references(() => coaches.id),
  date: date("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: checkinStatusEnum("status").notNull().default('scheduled'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Nutrition plans table
export const nutritionPlans = pgTable("nutrition_plans", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  coachId: integer("coach_id").notNull().references(() => coaches.id),
  title: text("title").notNull(),
  description: text("description"),
  proteinTarget: integer("protein_target").notNull(), // in grams
  carbsTarget: integer("carbs_target").notNull(), // in grams
  fatTarget: integer("fat_target").notNull(), // in grams
  caloriesTarget: integer("calories_target").notNull(), // in calories
  notes: text("notes"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(users, ({ many, one }) => ({
  client: one(clients, {
    fields: [users.id],
    references: [clients.userId],
  }),
  coach: one(coaches, {
    fields: [users.id],
    references: [coaches.userId],
  }),
  sentMessages: many(messages, {
    relationName: "sentMessages",
  }),
  receivedMessages: many(messages, {
    relationName: "receivedMessages",
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  coach: one(coaches, {
    fields: [clients.coachId],
    references: [coaches.id],
  }),
  weightLogs: many(weightLogs),
  progressPhotos: many(progressPhotos),
  checkins: many(checkins),
  nutritionPlans: many(nutritionPlans),
}));

export const coachesRelations = relations(coaches, ({ one, many }) => ({
  user: one(users, {
    fields: [coaches.userId],
    references: [users.id],
  }),
  clients: many(clients),
  checkins: many(checkins),
  nutritionPlans: many(nutritionPlans),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertCoachSchema = createInsertSchema(coaches).omit({ id: true });
export const insertWeightLogSchema = createInsertSchema(weightLogs).omit({ id: true, createdAt: true });
export const insertProgressPhotoSchema = createInsertSchema(progressPhotos).omit({ id: true, createdAt: true });
export const insertCheckinSchema = createInsertSchema(checkins).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, isRead: true });
export const insertNutritionPlanSchema = createInsertSchema(nutritionPlans).omit({ id: true, createdAt: true, updatedAt: true });

// Types for the application
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Coach = typeof coaches.$inferSelect;
export type InsertCoach = z.infer<typeof insertCoachSchema>;

export type WeightLog = typeof weightLogs.$inferSelect;
export type InsertWeightLog = z.infer<typeof insertWeightLogSchema>;

export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type InsertProgressPhoto = z.infer<typeof insertProgressPhotoSchema>;

export type Checkin = typeof checkins.$inferSelect;
export type InsertCheckin = z.infer<typeof insertCheckinSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type NutritionPlan = typeof nutritionPlans.$inferSelect;
export type InsertNutritionPlan = z.infer<typeof insertNutritionPlanSchema>;
