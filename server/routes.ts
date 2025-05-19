import express, { Request, Response, Router } from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertClientSchema,
  insertCoachSchema,
  insertWeightLogSchema,
  insertProgressPhotoSchema,
  insertCheckinSchema,
  insertMessageSchema,
  insertNutritionPlanSchema,
  users
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { ZodError } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import session from "express-session";
import createMemoryStore from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for progress photo uploads
const storage1 = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = (req.user as any)?.id || 'unknown';
    const userDir = path.join(uploadDir, userId.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage1,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.') as any);
    }
  }
});

// Set up memory store for sessions
const MemoryStore = createMemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: 'Incorrect username or password' });
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return done(null, false, { message: 'Incorrect username or password' });
      }
      
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  // Serialize and deserialize user for sessions
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Create API router
  const apiRouter = Router();

  // Authentication middleware for protected routes
  const isAuthenticated = (req: Request, res: Response, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
  };

  // Admin-only middleware
  const isAdmin = (req: Request, res: Response, next: any) => {
    if (req.isAuthenticated() && (req.user as any).role === 'admin') {
      return next();
    }
    res.status(403).json({ message: 'Forbidden' });
  };

  // Authentication routes
  apiRouter.post('/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Create client profile if role is client
      if (user.role === 'client') {
        const clientData = insertClientSchema.parse({
          userId: user.id,
          ...req.body.clientData
        });
        await storage.createClient(clientData);
      }
      
      // Create coach profile if role is admin
      if (user.role === 'admin') {
        const coachData = insertCoachSchema.parse({
          userId: user.id,
          ...req.body.coachData
        });
        await storage.createCoach(coachData);
      }
      
      // Log in the user after registration
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Error during login after registration' });
        }
        return res.status(201).json({ user: { ...user, password: undefined } });
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error during registration' });
    }
  });

  apiRouter.post('/auth/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Server error during login' });
      }
      
      if (!user) {
        console.error('Login failed:', info);
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Log the user in manually
      req.login(user, (err) => {
        if (err) {
          console.error('Login session error:', err);
          return res.status(500).json({ message: 'Error during login session creation' });
        }
        
        // Authentication successful
        return res.json({ user: { ...user, password: undefined } });
      });
    })(req, res, next);
  });

  apiRouter.post('/auth/logout', (req, res) => {
    req.logout(() => {
      res.json({ message: 'Logged out successfully' });
    });
  });

  apiRouter.get('/auth/me', isAuthenticated, (req, res) => {
    res.json({ user: { ...(req.user as any), password: undefined } });
  });

  // Weight logging routes
  apiRouter.post('/weight-logs', isAuthenticated, async (req, res) => {
    try {
      const clientId = req.body.clientId || (await storage.getClientByUserId((req.user as any).id))?.id;
      if (!clientId) {
        return res.status(400).json({ message: 'Client profile not found' });
      }
      
      const weightLogData = insertWeightLogSchema.parse({
        ...req.body,
        clientId
      });
      
      const weightLog = await storage.createWeightLog(weightLogData);
      res.status(201).json(weightLog);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error creating weight log' });
    }
  });

  apiRouter.get('/weight-logs', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const clientId = parseInt(req.query.clientId as string) || (await storage.getClientByUserId(user.id))?.id;
      
      if (!clientId) {
        return res.status(400).json({ message: 'Client profile not found' });
      }
      
      // Check if user is authorized to access these logs
      if (user.role !== 'admin' && (await storage.getClientByUserId(user.id))?.id !== clientId) {
        return res.status(403).json({ message: 'Unauthorized to access these weight logs' });
      }
      
      let weightLogs;
      if (req.query.startDate && req.query.endDate) {
        const startDate = new Date(req.query.startDate as string);
        const endDate = new Date(req.query.endDate as string);
        weightLogs = await storage.getWeightLogsByClientIdAndDateRange(clientId, startDate, endDate);
      } else {
        weightLogs = await storage.getWeightLogsByClientId(clientId);
      }
      
      res.json(weightLogs);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching weight logs' });
    }
  });

  // Progress photo routes
  apiRouter.post('/progress-photos', isAuthenticated, upload.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No photo uploaded' });
      }
      
      const clientId = req.body.clientId || (await storage.getClientByUserId((req.user as any).id))?.id;
      if (!clientId) {
        return res.status(400).json({ message: 'Client profile not found' });
      }
      
      const imageUrl = `/uploads/${(req.user as any).id}/${req.file.filename}`;
      
      const photoData = insertProgressPhotoSchema.parse({
        clientId,
        imageUrl,
        date: req.body.date || new Date().toISOString().split('T')[0],
        category: req.body.category,
        notes: req.body.notes
      });
      
      const photo = await storage.createProgressPhoto(photoData);
      res.status(201).json(photo);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error creating progress photo' });
    }
  });

  apiRouter.get('/progress-photos', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const clientId = parseInt(req.query.clientId as string) || (await storage.getClientByUserId(user.id))?.id;
      
      if (!clientId) {
        return res.status(400).json({ message: 'Client profile not found' });
      }
      
      // Check if user is authorized to access these photos
      if (user.role !== 'admin' && (await storage.getClientByUserId(user.id))?.id !== clientId) {
        return res.status(403).json({ message: 'Unauthorized to access these progress photos' });
      }
      
      const photos = await storage.getProgressPhotosByClientId(clientId);
      res.json(photos);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching progress photos' });
    }
  });

  // Check-in routes
  apiRouter.post('/checkins', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Only admin/coaches can create check-ins
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Only coaches can create check-ins' });
      }
      
      const coachId = (await storage.getCoachByUserId(user.id))?.id;
      if (!coachId) {
        return res.status(400).json({ message: 'Coach profile not found' });
      }
      
      const checkinData = insertCheckinSchema.parse({
        ...req.body,
        coachId
      });
      
      const checkin = await storage.createCheckin(checkinData);
      res.status(201).json(checkin);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error creating check-in' });
    }
  });
  
  // Route for clients to request a check-in
  apiRouter.post('/checkins/request', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Get client ID from the logged-in user
      const clientId = (await storage.getClientByUserId(user.id))?.id;
      if (!clientId) {
        // Create client profile if it doesn't exist
        const clientData = {
          userId: user.id,
          height: null,
          startingWeight: null,
          goalWeight: null,
          dateOfBirth: null,
          coachId: null
        };
        const client = await storage.createClient(clientData);
        if (!client) {
          return res.status(500).json({ message: 'Failed to create client profile' });
        }
      }
      
      // Get the client again or use the one we already have
      const client = await storage.getClientByUserId(user.id);
      
      // Get a coach to assign - in this case, we'll use a default coach ID
      const coachId = 1;
      
      // Log the incoming data for debugging
      console.log('Received check-in request data:', req.body);
      
      // Parse the data properly for the database
      const checkinData = {
        clientId: client!.id,
        coachId: coachId,
        date: req.body.date,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        status: 'scheduled' as const,
        notes: req.body.notes || null
      };
      
      const checkin = await storage.createCheckin(checkinData);
      res.status(201).json(checkin);
    } catch (error) {
      console.error('Check-in request error:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error requesting check-in' });
    }
  });

  apiRouter.get('/checkins', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const clientId = parseInt(req.query.clientId as string) || (await storage.getClientByUserId(user.id))?.id;
      
      if (user.role !== 'admin' && !clientId) {
        return res.status(400).json({ message: 'Client profile not found' });
      }
      
      // Check if user is authorized to access these check-ins
      if (user.role !== 'admin' && (await storage.getClientByUserId(user.id))?.id !== clientId) {
        return res.status(403).json({ message: 'Unauthorized to access these check-ins' });
      }
      
      const upcoming = req.query.upcoming === 'true';
      const checkins = upcoming 
        ? await storage.getUpcomingCheckinsByClientId(clientId)
        : await storage.getCheckinsByClientId(clientId);
      
      res.json(checkins);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching check-ins' });
    }
  });

  apiRouter.patch('/checkins/:id/status', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['scheduled', 'confirmed', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      const checkin = await storage.updateCheckinStatus(parseInt(id), status);
      res.json(checkin);
    } catch (error) {
      res.status(500).json({ message: 'Server error updating check-in status' });
    }
  });

  // Messaging routes
  apiRouter.post('/messages', isAuthenticated, async (req, res) => {
    try {
      const senderId = (req.user as any).id;
      
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId
      });
      
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error creating message' });
    }
  });

  apiRouter.get('/messages', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      if (req.query.otherUserId) {
        const otherUserId = parseInt(req.query.otherUserId as string);
        const conversation = await storage.getConversation(userId, otherUserId);
        return res.json(conversation);
      }
      
      const messages = await storage.getMessagesByUserId(userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching messages' });
    }
  });

  apiRouter.patch('/messages/:id/read', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const message = await storage.markMessageAsRead(parseInt(id));
      res.json(message);
    } catch (error) {
      res.status(500).json({ message: 'Server error marking message as read' });
    }
  });

  // Nutrition plan routes
  apiRouter.post('/nutrition-plans', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Only admin/coaches can create nutrition plans
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Only coaches can create nutrition plans' });
      }
      
      const coachId = (await storage.getCoachByUserId(user.id))?.id;
      if (!coachId) {
        return res.status(400).json({ message: 'Coach profile not found' });
      }
      
      const nutritionPlanData = insertNutritionPlanSchema.parse({
        ...req.body,
        coachId
      });
      
      const nutritionPlan = await storage.createNutritionPlan(nutritionPlanData);
      res.status(201).json(nutritionPlan);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error creating nutrition plan' });
    }
  });

  apiRouter.get('/nutrition-plans', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const clientId = parseInt(req.query.clientId as string) || (await storage.getClientByUserId(user.id))?.id;
      
      if (!clientId) {
        return res.status(400).json({ message: 'Client profile not found' });
      }
      
      // Check if user is authorized to access these nutrition plans
      if (user.role !== 'admin' && (await storage.getClientByUserId(user.id))?.id !== clientId) {
        return res.status(403).json({ message: 'Unauthorized to access these nutrition plans' });
      }
      
      const currentOnly = req.query.current === 'true';
      
      if (currentOnly) {
        const currentPlan = await storage.getCurrentNutritionPlan(clientId);
        return res.json(currentPlan || null);
      }
      
      const nutritionPlans = await storage.getNutritionPlansByClientId(clientId);
      res.json(nutritionPlans);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching nutrition plans' });
    }
  });

  // Device integration routes
  apiRouter.get('/integrations', isAuthenticated, async (req, res) => {
    try {
      const integrations = await storage.getDeviceIntegrationsByUserId(req.user!.id);
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching integrations' });
    }
  });

  apiRouter.post('/integrations', isAuthenticated, async (req, res) => {
    try {
      const integrationData = {
        ...req.body,
        userId: req.user!.id
      };
      
      // Check if integration already exists
      const existingIntegration = await storage.getDeviceIntegrationByUserId(
        req.user!.id, 
        integrationData.provider
      );
      
      if (existingIntegration) {
        // Update existing integration
        const updated = await storage.updateDeviceIntegration(
          existingIntegration.id,
          integrationData
        );
        return res.json(updated);
      }
      
      // Create new integration
      const created = await storage.createDeviceIntegration(integrationData);
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ message: 'Server error creating integration' });
    }
  });

  apiRouter.delete('/integrations/:id', isAuthenticated, async (req, res) => {
    try {
      const integrationId = parseInt(req.params.id);
      
      // Check if integration exists and belongs to user
      const integrations = await storage.getDeviceIntegrationsByUserId(req.user!.id);
      const userOwnsIntegration = integrations.some(i => i.id === integrationId);
      
      if (!userOwnsIntegration) {
        return res.status(403).json({ message: 'Unauthorized to delete this integration' });
      }
      
      await storage.deleteDeviceIntegration(integrationId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Server error deleting integration' });
    }
  });

  // Webhook for Feelfit data
  app.post('/api/webhook/feelfit', async (req, res) => {
    try {
      // Extract the relevant data from the webhook payload
      const { userId, weight, timestamp, token } = req.body;
      
      if (!userId || !weight || !timestamp || !token) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Verify the token matches the stored token for this integration
      const integration = await storage.getDeviceIntegrationByUserId(
        parseInt(userId), 
        'feelfit'
      );
      
      if (!integration || integration.accessToken !== token) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      // Get the client associated with this user
      const client = await storage.getClientByUserId(parseInt(userId));
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Create a new weight log from the Feelfit data
      const weightLog = {
        clientId: client.id,
        weight: parseFloat(weight),
        date: new Date(timestamp),
        notes: 'Recorded from Feelfit scale'
      };
      
      const created = await storage.createWeightLog(weightLog);
      
      // Update the integration's last synced timestamp
      await storage.updateDeviceIntegration(integration.id, {
        lastSyncedAt: new Date(),
      });
      
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      console.error('Feelfit webhook error:', error);
      res.status(500).json({ message: 'Server error processing Feelfit data' });
    }
  });

  // Avatar upload route
  apiRouter.post('/users/avatar', isAuthenticated, upload.single('avatar'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const user = req.user as any;
      const avatarPath = `/uploads/${user.id}/${req.file.filename}`;
      
      // Update user with avatar path in database
      const updatedUser = await db
        .update(users)
        .set({ avatar: avatarPath })
        .where(eq(users.id, user.id))
        .returning();
      
      if (!updatedUser.length) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ 
        success: true, 
        avatarUrl: avatarPath,
        user: { ...updatedUser[0], password: undefined }
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ message: 'Server error uploading avatar' });
    }
  });

  // Mount API routes
  app.use('/api', apiRouter);
  
  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  const httpServer = createServer(app);
  return httpServer;
}
