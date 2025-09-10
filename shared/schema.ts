import { pgTable, text, serial, integer, boolean, timestamp, date, decimal, pgEnum, foreignKey, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['client', 'admin']);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username"),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"), 
  role: text("role").notNull().default('client'), // Changed from enum to text to match Supabase
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  phone: text("phone"),
  packageType: text("package_type"),
  goals: text("goals"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

// Device integrations table (for Feelfit and other services)
export const deviceIntegrations = pgTable("device_integrations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // e.g., "feelfit", "fitbit", etc.
  externalId: text("external_id"), // User ID in the external system
  accessToken: text("access_token"), // OAuth token or API key
  refreshToken: text("refresh_token"), // For OAuth refresh
  tokenExpiresAt: timestamp("token_expires_at"),
  lastSyncedAt: timestamp("last_synced_at"),
  isActive: boolean("is_active").default(true),
  metadata: text("metadata"), // Additional provider-specific data as JSON string
  createdAt: timestamp("created_at").defaultNow(),
});

// Exercise library
export const difficultyLevelEnum = pgEnum('difficulty_level', ['beginner', 'intermediate', 'advanced']);

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  muscleGroups: text("muscle_groups").array(), // Array of muscle groups
  equipment: text("equipment"),
  difficultyLevel: difficultyLevelEnum("difficulty_level"),
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  createdBy: integer("created_by").references(() => users.id),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Workout programs
export const programTypeEnum = pgEnum('program_type', ['strength', 'cardio', 'hybrid', 'flexibility', 'sports_specific']);

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  coachId: integer("coach_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  durationWeeks: integer("duration_weeks"),
  difficultyLevel: difficultyLevelEnum("difficulty_level"),
  programType: programTypeEnum("program_type"),
  isTemplate: boolean("is_template").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Individual workouts within programs
export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => programs.id),
  name: text("name").notNull(),
  description: text("description"),
  dayNumber: integer("day_number"), // Day in program sequence
  weekNumber: integer("week_number"), // Week in program
  estimatedDuration: integer("estimated_duration"), // Minutes
  instructions: text("instructions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Exercises within workouts
export const workoutExercises = pgTable("workout_exercises", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").notNull().references(() => workouts.id),
  exerciseId: integer("exercise_id").notNull().references(() => exercises.id),
  orderIndex: integer("order_index").notNull(), // Order in workout
  sets: integer("sets"),
  reps: text("reps"), // Can be range like "8-12"
  weight: text("weight"), // Can be percentage or fixed
  restSeconds: integer("rest_seconds"),
  notes: text("notes"),
  isSuperset: boolean("is_superset").default(false),
  supersetGroup: integer("superset_group"),
});

// Client program assignments
export const programStatusEnum = pgEnum('program_status', ['active', 'completed', 'paused']);

export const clientPrograms = pgTable("client_programs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  programId: integer("program_id").notNull().references(() => programs.id),
  assignedBy: integer("assigned_by").notNull().references(() => users.id), // Coach
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: programStatusEnum("status").default('active'),
  currentWeek: integer("current_week").default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Workout logging
export const workoutStatusEnum = pgEnum('workout_status', ['planned', 'in_progress', 'completed', 'skipped']);

export const workoutLogs = pgTable("workout_logs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  workoutId: integer("workout_id").notNull().references(() => workouts.id),
  programId: integer("program_id").references(() => programs.id),
  date: date("date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  status: workoutStatusEnum("status").default('planned'),
  notes: text("notes"),
  rating: integer("rating"), // 1-5 workout difficulty rating
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Exercise performance logging
export const exerciseLogs = pgTable("exercise_logs", {
  id: serial("id").primaryKey(),
  workoutLogId: integer("workout_log_id").notNull().references(() => workoutLogs.id),
  exerciseId: integer("exercise_id").notNull().references(() => exercises.id),
  orderIndex: integer("order_index").notNull(),
  setsCompleted: integer("sets_completed"),
  repsCompleted: integer("reps_completed").array(),
  weightUsed: decimal("weight_used").array(),
  restTime: integer("rest_time").array(), // Actual rest times
  notes: text("notes"),
  personalRecord: boolean("personal_record").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enhanced meal planning
export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  coachId: integer("coach_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  totalCalories: integer("total_calories"),
  proteinGrams: integer("protein_grams"),
  carbsGrams: integer("carbs_grams"),
  fatsGrams: integer("fats_grams"),
  fiberGrams: integer("fiber_grams"),
  isTemplate: boolean("is_template").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mealTypeEnum = pgEnum('meal_type', ['breakfast', 'lunch', 'dinner', 'snack']);

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  mealPlanId: integer("meal_plan_id").notNull().references(() => mealPlans.id),
  name: text("name").notNull(),
  mealType: mealTypeEnum("meal_type"),
  calories: integer("calories"),
  proteinGrams: decimal("protein_grams"),
  carbsGrams: decimal("carbs_grams"),
  fatsGrams: decimal("fats_grams"),
  fiberGrams: decimal("fiber_grams"),
  instructions: text("instructions"),
  imageUrl: text("image_url"),
  prepTime: integer("prep_time"), // Minutes
  orderIndex: integer("order_index"),
});

export const mealPlanStatusEnum = pgEnum('meal_plan_status', ['active', 'completed', 'paused']);

export const clientMealPlans = pgTable("client_meal_plans", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  mealPlanId: integer("meal_plan_id").notNull().references(() => mealPlans.id),
  assignedBy: integer("assigned_by").notNull().references(() => users.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: mealPlanStatusEnum("status").default('active'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enhanced body measurements
export const bodyMeasurements = pgTable("body_measurements", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  weight: decimal("weight"),
  bodyFatPercentage: decimal("body_fat_percentage"),
  muscleMass: decimal("muscle_mass"),
  chest: decimal("chest"),
  waist: decimal("waist"),
  hips: decimal("hips"),
  bicepLeft: decimal("bicep_left"),
  bicepRight: decimal("bicep_right"),
  thighLeft: decimal("thigh_left"),
  thighRight: decimal("thigh_right"),
  measurementsJson: text("measurements_json"), // For custom measurements as JSON
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Coach-Client relationships
export const relationshipStatusEnum = pgEnum('relationship_status', ['active', 'paused', 'ended']);

export const coachClients = pgTable("coach_clients", {
  id: serial("id").primaryKey(),
  coachId: integer("coach_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => users.id),
  startDate: date("start_date").notNull().default(sql`CURRENT_DATE`),
  endDate: date("end_date"),
  status: relationshipStatusEnum("status").default('active'),
  packageType: text("package_type"), // Custom package names
  billingCycle: text("billing_cycle"), // monthly, weekly, etc.
  rate: decimal("rate"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Add unique constraint for coach-client relationships
export const coachClientsUniqueIndex = unique("coach_client_unique").on(coachClients.coachId, coachClients.clientId);

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
  deviceIntegrations: many(deviceIntegrations),
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

export const deviceIntegrationsRelations = relations(deviceIntegrations, ({ one }) => ({
  user: one(users, {
    fields: [deviceIntegrations.userId],
    references: [users.id],
  }),
}));

// Exercise relations
export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [exercises.createdBy],
    references: [users.id],
  }),
  workoutExercises: many(workoutExercises),
  exerciseLogs: many(exerciseLogs),
}));

// Program relations
export const programsRelations = relations(programs, ({ one, many }) => ({
  coach: one(users, {
    fields: [programs.coachId],
    references: [users.id],
  }),
  workouts: many(workouts),
  clientPrograms: many(clientPrograms),
  workoutLogs: many(workoutLogs),
}));

// Workout relations
export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  program: one(programs, {
    fields: [workouts.programId],
    references: [programs.id],
  }),
  workoutExercises: many(workoutExercises),
  workoutLogs: many(workoutLogs),
}));

// Workout exercise relations
export const workoutExercisesRelations = relations(workoutExercises, ({ one }) => ({
  workout: one(workouts, {
    fields: [workoutExercises.workoutId],
    references: [workouts.id],
  }),
  exercise: one(exercises, {
    fields: [workoutExercises.exerciseId],
    references: [exercises.id],
  }),
}));

// Client program relations
export const clientProgramsRelations = relations(clientPrograms, ({ one }) => ({
  client: one(users, {
    fields: [clientPrograms.clientId],
    references: [users.id],
  }),
  program: one(programs, {
    fields: [clientPrograms.programId],
    references: [programs.id],
  }),
  assignedBy: one(users, {
    fields: [clientPrograms.assignedBy],
    references: [users.id],
  }),
}));

// Workout log relations
export const workoutLogsRelations = relations(workoutLogs, ({ one, many }) => ({
  client: one(users, {
    fields: [workoutLogs.clientId],
    references: [users.id],
  }),
  workout: one(workouts, {
    fields: [workoutLogs.workoutId],
    references: [workouts.id],
  }),
  program: one(programs, {
    fields: [workoutLogs.programId],
    references: [programs.id],
  }),
  exerciseLogs: many(exerciseLogs),
}));

// Exercise log relations
export const exerciseLogsRelations = relations(exerciseLogs, ({ one }) => ({
  workoutLog: one(workoutLogs, {
    fields: [exerciseLogs.workoutLogId],
    references: [workoutLogs.id],
  }),
  exercise: one(exercises, {
    fields: [exerciseLogs.exerciseId],
    references: [exercises.id],
  }),
}));

// Meal plan relations
export const mealPlansRelations = relations(mealPlans, ({ one, many }) => ({
  coach: one(users, {
    fields: [mealPlans.coachId],
    references: [users.id],
  }),
  meals: many(meals),
  clientMealPlans: many(clientMealPlans),
}));

// Meal relations
export const mealsRelations = relations(meals, ({ one }) => ({
  mealPlan: one(mealPlans, {
    fields: [meals.mealPlanId],
    references: [mealPlans.id],
  }),
}));

// Client meal plan relations
export const clientMealPlansRelations = relations(clientMealPlans, ({ one }) => ({
  client: one(users, {
    fields: [clientMealPlans.clientId],
    references: [users.id],
  }),
  mealPlan: one(mealPlans, {
    fields: [clientMealPlans.mealPlanId],
    references: [mealPlans.id],
  }),
  assignedBy: one(users, {
    fields: [clientMealPlans.assignedBy],
    references: [users.id],
  }),
}));

// Body measurements relations
export const bodyMeasurementsRelations = relations(bodyMeasurements, ({ one }) => ({
  client: one(users, {
    fields: [bodyMeasurements.clientId],
    references: [users.id],
  }),
}));

// Coach-Client relations
export const coachClientsRelations = relations(coachClients, ({ one }) => ({
  coach: one(users, {
    fields: [coachClients.coachId],
    references: [users.id],
  }),
  client: one(users, {
    fields: [coachClients.clientId],
    references: [users.id],
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
export const insertDeviceIntegrationSchema = createInsertSchema(deviceIntegrations).omit({ id: true, createdAt: true });

// New schemas for enhanced platform
export const insertExerciseSchema = createInsertSchema(exercises).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProgramSchema = createInsertSchema(programs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkoutSchema = createInsertSchema(workouts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkoutExerciseSchema = createInsertSchema(workoutExercises).omit({ id: true });
export const insertClientProgramSchema = createInsertSchema(clientPrograms).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkoutLogSchema = createInsertSchema(workoutLogs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExerciseLogSchema = createInsertSchema(exerciseLogs).omit({ id: true, createdAt: true });
export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMealSchema = createInsertSchema(meals).omit({ id: true });
export const insertClientMealPlanSchema = createInsertSchema(clientMealPlans).omit({ id: true, createdAt: true });
export const insertBodyMeasurementSchema = createInsertSchema(bodyMeasurements).omit({ id: true, createdAt: true });
export const insertCoachClientSchema = createInsertSchema(coachClients).omit({ id: true, createdAt: true, updatedAt: true });

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

export type DeviceIntegration = typeof deviceIntegrations.$inferSelect;
export type InsertDeviceIntegration = z.infer<typeof insertDeviceIntegrationSchema>;

// New types for enhanced platform
export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;

export type Program = typeof programs.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;

export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;

export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type InsertWorkoutExercise = z.infer<typeof insertWorkoutExerciseSchema>;

export type ClientProgram = typeof clientPrograms.$inferSelect;
export type InsertClientProgram = z.infer<typeof insertClientProgramSchema>;

export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type InsertWorkoutLog = z.infer<typeof insertWorkoutLogSchema>;

export type ExerciseLog = typeof exerciseLogs.$inferSelect;
export type InsertExerciseLog = z.infer<typeof insertExerciseLogSchema>;

export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;

export type Meal = typeof meals.$inferSelect;
export type InsertMeal = z.infer<typeof insertMealSchema>;

export type ClientMealPlan = typeof clientMealPlans.$inferSelect;
export type InsertClientMealPlan = z.infer<typeof insertClientMealPlanSchema>;

export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;
export type InsertBodyMeasurement = z.infer<typeof insertBodyMeasurementSchema>;

export type CoachClient = typeof coachClients.$inferSelect;
export type InsertCoachClient = z.infer<typeof insertCoachClientSchema>;
