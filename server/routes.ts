import express, { Request, Response, Router } from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { SupabaseStorage } from "./supabase-storage";
import {
  insertUserSchema,
  insertClientSchema,
  insertCoachSchema,
  insertWeightLogSchema,
  insertProgressPhotoSchema,
  insertCheckinSchema,
  insertMessageSchema,
  insertNutritionPlanSchema,
  insertExerciseSchema,
  insertProgramSchema,
  insertWorkoutSchema,
  insertWorkoutExerciseSchema,
  insertClientProgramSchema,
  insertWorkoutLogSchema,
  insertExerciseLogSchema,
  users
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { ZodError } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import rateLimit from "express-rate-limit";
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import passport from 'passport';

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for progress photo uploads
const storage1 = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = (req as any).user?.id || 'unknown';
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

// Supabase client setup for JWT verification
// Use working Supabase URL (temporary fix for environment variable caching)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Rate limiting configuration
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs for auth endpoints
  message: { message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500, // Increase limit to prevent blocking normal usage
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Add CORS headers with secure allowlist
  app.use((req, res, next) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000', 
      'https://your-app-domain.replit.app' // Replace with actual domain
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    
    next();
  });

  // Helper function to get RLS-aware storage with JWT token
  const getRlsStorage = (req: Request): SupabaseStorage => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, '').replace(/^"(.*)"$/, '$1');
    
    if (!token || token === 'null' || token === 'undefined') {
      throw new Error('Valid JWT token required for RLS enforcement');
    }
    
    return SupabaseStorage.withUserToken(token);
  };

  // No session setup needed - using Supabase JWT tokens

  // Create API router
  const apiRouter = Router();

  // Flexible Authentication middleware (supports both JWT and session)
  const isAuthenticated = async (req: Request, res: Response, next: any) => {
    try {
      console.log('🔍 Auth middleware called for:', req.method, req.path);
      
      // First try JWT authentication - robust header parsing
      const authHeader = req.headers.authorization;
      console.log('🔍 Authorization header present:', !!authHeader);
      
      if (authHeader) {
        const [scheme, ...rest] = authHeader.split(' ');
        console.log('🔍 Auth scheme:', scheme);
        
        if ((scheme || '').toLowerCase() === 'bearer') {
          const rawToken = rest.join(' ').trim();
          // Strip quotes and handle null/undefined
          const token = rawToken.replace(/^"|"$/g, '');
          
          console.log('🔍 Token extracted:', !!token && token !== 'null' && token !== 'undefined');
          
          if (token && token !== 'null' && token !== 'undefined') {
            console.log('🔍 Token length:', token.length);
            
            try {
              // Verify the JWT token with Supabase
              const { data: { user }, error } = await supabase.auth.getUser(token);
              
              if (error) {
                console.log('❌ Supabase auth error:', error.message);
              } else if (user) {
                // Attach user info to request
                (req as any).user = {
                  id: user.id,
                  email: user.email,
                  role: user.user_metadata?.role || 'client',
                  firstName: user.user_metadata?.first_name,
                  lastName: user.user_metadata?.last_name
                };

                console.log('✅ User authenticated via JWT:', { 
                  id: user.id, 
                  email: user.email, 
                  role: user.user_metadata?.role 
                });

                return next();
              }
            } catch (supabaseError) {
              console.log('❌ Supabase verification failed:', (supabaseError as any).message);
            }
          } else {
            console.log('❌ Invalid token value:', rawToken);
          }
        } else {
          console.log('❌ Invalid auth scheme:', scheme);
        }
      }

      // Fallback to session authentication
      if ((req as any).session?.user) {
        (req as any).user = (req as any).session.user;
        console.log('✅ User authenticated via session:', { 
          id: (req as any).session.user.id, 
          email: (req as any).session.user.email,
          role: (req as any).session.user.role
        });
        return next();
      }

      console.log('❌ No valid authentication found for:', req.method, req.path);
      return res.status(401).json({ message: 'Unauthorized - No valid authentication' });
    } catch (error) {
      console.log('❌ Auth middleware error for', req.method, req.path, ':', error);
      res.status(401).json({ message: 'Unauthorized - Auth error' });
    }
  };

  // Admin-only middleware
  const isAdmin = async (req: Request, res: Response, next: any) => {
    const user = (req as any).user;
    if (user && user.role === 'admin') {
      return next();
    }
    res.status(403).json({ message: 'Forbidden - Admin access required' });
  };

  // Apply rate limiting to specific auth routes only (not /auth/me)
  apiRouter.use('/auth/register', authRateLimit);
  apiRouter.use('/auth/login', authRateLimit);
  apiRouter.use('/auth/register-demo', authRateLimit);
  apiRouter.use('/auth/login-demo', authRateLimit);
  apiRouter.use('/auth/register-supabase', authRateLimit);
  apiRouter.use('/auth/login-simple', authRateLimit);
  apiRouter.use('/auth/register-simple', authRateLimit);
  
  // Apply general rate limiting to all other API routes
  apiRouter.use(generalRateLimit);
  
  // Secure health check endpoint - no database credentials exposed
  apiRouter.get('/health', async (req, res) => {
    try {
      res.json({ 
        success: true, 
        message: 'API is healthy',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: 'Health check failed'
      });
    }
  });
  
  // Demo registration endpoint that bypasses database issues
  apiRouter.post('/auth/register-demo', async (req, res) => {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Demo registration attempt:', { 
        username: req.body.username, 
        email: req.body.email,
        role: req.body.role 
      });
      
      const { username, email, password, firstName, lastName, role } = req.body;
      
      if (!username || !email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'All fields are required' });
      }
      
      // Create a mock user object for demo purposes
      const mockUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username,
        email,
        first_name: firstName,
        last_name: lastName,
        role: role || 'client',
        created_at: new Date().toISOString()
      };
      
      console.log('✅ Demo user created:', { id: mockUser.id, email: mockUser.email, role: mockUser.role });
      
      // Create session manually (if session middleware is available)
      if ((req as any).session) {
        (req as any).session.userId = mockUser.id;
        (req as any).session.user = mockUser;
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Demo registration completed in ${duration}ms`);
      
      res.json({ 
        success: true,
        user: mockUser,
        message: 'Registration successful (demo mode - user created in session only)'
      });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`❌ Demo registration failed after ${duration}ms:`, error.message);
      res.status(500).json({ message: 'Registration failed', error: error.message });
    }
  });

  // Supabase Auth registration endpoint
  apiRouter.post('/auth/register-supabase', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { username, email, password, firstName, lastName, role } = req.body;
      
      console.log('🔍 Supabase registration attempt:', { email, username, role });
      
      // Use Supabase Auth to create the user
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL || 'https://vdykrlyybwwbcqqcgjbp.supabase.co';
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
      
      if (!supabaseAnonKey) {
        return res.status(500).json({ message: 'SUPABASE_ANON_KEY environment variable must be set' });
      }
      
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      // Create user with Supabase Auth (using signUp instead of admin.createUser)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            first_name: firstName,
            last_name: lastName,
            role: role || 'client'
          }
        }
      });
      
      if (error) {
        console.log('❌ Supabase Auth error:', error);
        return res.status(400).json({ message: 'Registration failed', error: error.message });
      }
      
      console.log('✅ User created with Supabase Auth:', { id: data.user?.id, email: data.user?.email });
      
      // Create session manually for immediate login (if session middleware is available)
      const user = {
        id: data.user?.id,
        username,
        email: data.user?.email || email,
        first_name: firstName,
        last_name: lastName,
        role: role || 'client',
        created_at: data.user?.created_at
      };
      
      if ((req as any).session) {
        (req as any).session.userId = user.id;
        (req as any).session.user = user;
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Supabase registration completed in ${duration}ms`);
      
      res.status(201).json({ 
        success: true,
        user: user
      });
      
    } catch (error: any) {
      console.log('❌ Registration error:', error.message);
      res.status(500).json({ message: 'Registration failed', error: error.message });
    }
  });

  // REMOVED: Insecure registration endpoint that bypassed RLS
  
  // Original registration endpoint with debugging and error handling
  apiRouter.post('/auth/register', async (req, res) => {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Registration attempt:', { 
        email: req.body.email, 
        username: req.body.username,
        role: req.body.role 
      });
      
      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Registration timeout after 30 seconds')), 30000);
      });
      
      const registrationPromise = (async () => {
      const userData: any = insertUserSchema.parse(req.body);
        
        console.log('✅ Schema validation passed');
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
          console.log('❌ Username already exists:', userData.username);
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
          console.log('❌ Email already exists:', userData.email);
        return res.status(400).json({ message: 'Email already exists' });
      }
        
        console.log('✅ Username and email are available');
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
        console.log('✅ Password hashed');
      
      // Create user with hashed password
        console.log('🔄 Creating user in database...');
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
        
        console.log('✅ User created in database:', { id: user.id, email: user.email, role: user.role });
      
      // Create client profile if role is client
      if (user.role === 'client') {
          console.log('🔄 Creating client profile...');
        try {
          const clientData = insertClientSchema.parse({
            userId: user.id,
            // Provide defaults if clientData is missing
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email,
            ...req.body.clientData
          });
          await storage.createClient(clientData);
          console.log('✅ Client profile created');
        } catch (clientError) {
          console.log('⚠️ Client profile creation failed, creating minimal profile:', (clientError as any).message);
          // Create minimal client profile with required fields only
          const minimalClientData = {
            userId: user.id,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email
          };
          await storage.createClient(minimalClientData);
          console.log('✅ Minimal client profile created');
        }
      }
      
      // Create coach profile if role is admin
      if (user.role === 'admin') {
          console.log('🔄 Creating coach profile...');
        const coachData = insertCoachSchema.parse({
          userId: user.id,
          ...req.body.coachData
        });
        await storage.createCoach(coachData);
          console.log('✅ Coach profile created');
      }
        
        console.log('🔄 Logging in user...');
      
      // Log in the user after registration (if using session-based auth)
      if ((req as any).login) {
        (req as any).login(user, (err: any) => {
          if (err) {
              console.log('❌ Login after registration failed:', err.message);
            return res.status(500).json({ message: 'Error during login after registration' });
          }
            
            const duration = Date.now() - startTime;
            console.log(`✅ Registration completed in ${duration}ms`);
          return res.status(201).json({ user: { ...user, password: undefined } });
        });
      } else {
        // If not using session-based auth, just return the user
        const duration = Date.now() - startTime;
        console.log(`✅ Registration completed in ${duration}ms`);
        return res.status(201).json({ user: { ...user, password: undefined } });
      }
      })();
      
      // Race between registration and timeout
      await Promise.race([registrationPromise, timeoutPromise]);
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`❌ Registration failed after ${duration}ms:`, error.message);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error during registration' });
    }
  });

  // Protected endpoint to get current user (JWT-based)
  apiRouter.get('/auth/me', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      console.log('✅ Current authenticated user:', { 
        id: user.id, 
        email: user.email,
        role: user.role 
      });
      res.json({ user });
    } catch (error) {
      console.log('❌ Auth check failed:', (error as any).message);
      res.status(500).json({ message: 'Auth check failed', error: (error as any).message });
    }
  });

  // Demo login endpoint that works with session-based users
  apiRouter.post('/auth/login-demo', async (req, res) => {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Demo login attempt:', { username: req.body.username });
      
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      // For demo purposes, create a mock user based on username
      // In a real app, this would query the database
      const mockUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username,
        email: `${username}@example.com`,
        first_name: username.includes('coach') ? 'Coach' : 'Client',
        last_name: 'User',
        role: username.includes('coach') ? 'admin' : 'client',
        created_at: new Date().toISOString()
      };
      
      console.log('✅ Demo user logged in:', { id: mockUser.id, email: mockUser.email, role: mockUser.role });
      
      // Create session manually (if session middleware is available)
      if ((req as any).session) {
        (req as any).session.userId = mockUser.id;
        (req as any).session.user = mockUser;
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Demo login completed in ${duration}ms`);
      
      res.json({ 
        success: true,
        user: mockUser
      });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`❌ Demo login failed after ${duration}ms:`, error.message);
      res.status(500).json({ message: 'Login failed', error: error.message });
    }
  });

  // REMOVED: Insecure login endpoint that bypassed password verification and RLS

  apiRouter.post('/auth/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
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

  // Password reset routes
  apiRouter.post('/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // For security, don't reveal if email exists or not
        return res.json({ message: 'If the email exists, a password reset link has been sent.' });
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
      
      // Store reset token in database
      await storage.setPasswordResetToken(user.id, resetToken, resetTokenExpiry);
      
      // For now, just log the reset URL to console (admin can share it with user)
      const resetUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
      console.log(`Password reset requested for ${email}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log(`Reset token: ${resetToken}`);
      console.log(`Token expires at: ${resetTokenExpiry.toISOString()}`)
      
      res.json({ message: 'If the email exists, a password reset link has been sent.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Server error processing password reset request' });
    }
  });
  
  apiRouter.post('/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }
      
      // Find user with valid reset token
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password and clear reset token
      await storage.updatePassword(user.id, hashedPassword);
      await storage.clearPasswordResetToken(user.id);
      
      res.json({ message: 'Password has been successfully reset.' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Server error resetting password' });
    }
  });

  // Weight logging routes
  apiRouter.post('/weight-logs', isAuthenticated, async (req, res) => {
    try {
      const rlsStorage = getRlsStorage(req);
      const clientId = req.body.clientId || (await rlsStorage.getClientByUserId((req.user as any).id))?.id;
      if (!clientId) {
        return res.status(400).json({ message: 'Client profile not found' });
      }
      
      const weightLogData = insertWeightLogSchema.parse({
        ...req.body,
        clientId
      });
      
      const weightLog = await rlsStorage.createWeightLog(weightLogData);
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
      const rlsStorage = getRlsStorage(req);
      const clientId = parseInt(req.query.clientId as string) || (await rlsStorage.getClientByUserId(user.id))?.id;
      
      if (!clientId) {
        return res.status(400).json({ message: 'Client profile not found' });
      }
      
      // RLS will handle authorization checks, but we still do explicit checks for transparency
      if (user.role !== 'admin' && (await rlsStorage.getClientByUserId(user.id))?.id !== clientId) {
        return res.status(403).json({ message: 'Unauthorized to access these weight logs' });
      }
      
      let weightLogs;
      if (req.query.startDate && req.query.endDate) {
        const startDate = new Date(req.query.startDate as string);
        const endDate = new Date(req.query.endDate as string);
        weightLogs = await rlsStorage.getWeightLogsByClientIdAndDateRange(clientId, startDate, endDate);
      } else {
        weightLogs = await rlsStorage.getWeightLogsByClientId(clientId);
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
      
      const rlsStorage = getRlsStorage(req);
      const clientId = req.body.clientId || (await rlsStorage.getClientByUserId((req.user as any).id))?.id;
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
      
      const photo = await rlsStorage.createProgressPhoto(photoData);
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
      const rlsStorage = getRlsStorage(req);
      const clientId = parseInt(req.query.clientId as string) || (await rlsStorage.getClientByUserId(user.id))?.id;
      
      if (!clientId) {
        return res.status(400).json({ message: 'Client profile not found' });
      }
      
      // RLS will handle authorization checks, but we still do explicit checks for transparency
      if (user.role !== 'admin' && (await rlsStorage.getClientByUserId(user.id))?.id !== clientId) {
        return res.status(403).json({ message: 'Unauthorized to access these progress photos' });
      }
      
      const photos = await rlsStorage.getProgressPhotosByClientId(clientId);
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
      
      const rlsStorage = getRlsStorage(req);
      const coachId = (await rlsStorage.getCoachByUserId(user.id))?.id;
      if (!coachId) {
        return res.status(400).json({ message: 'Coach profile not found' });
      }
      
      const checkinData = insertCheckinSchema.parse({
        ...req.body,
        coachId
      });
      
      const checkin = await rlsStorage.createCheckin(checkinData);
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
      
      const rlsStorage = getRlsStorage(req);
      // Get client ID from the logged-in user
      const clientId = (await rlsStorage.getClientByUserId(user.id))?.id;
      let client;
      
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
        client = await rlsStorage.createClient(clientData);
        if (!client) {
          return res.status(500).json({ message: 'Failed to create client profile' });
        }
      } else {
        // Get the client again or use the one we already have
        client = await rlsStorage.getClientByUserId(user.id);
      }
      
      // Get a coach to assign - in this case, we'll use a default coach ID
      const coachId = 1;
      
      // Log the incoming data for debugging
      console.log('Received check-in request data:', req.body);
      
      // Validate the required fields
      if (!req.body.date || !req.body.startTime || !req.body.endTime) {
        return res.status(400).json({ 
          message: 'Missing required fields',
          details: 'Please provide date, startTime, and endTime' 
        });
      }
      
      // Parse the data properly for the database
      const checkinData = {
        clientId: client?.id || 0,
        coachId: coachId,
        date: req.body.date,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        status: 'scheduled' as const,
        notes: req.body.notes || null
      };
      
      console.log('Creating check-in with data:', checkinData);
      
      const checkin = await rlsStorage.createCheckin(checkinData);
      console.log('Check-in created:', checkin);
      res.status(201).json(checkin);
    } catch (error) {
      console.error('Check-in request error:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: 'Invalid data', 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: 'Server error requesting check-in', 
        error: (error as Error).message 
      });
    }
  });

  apiRouter.get('/checkins', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const rlsStorage = getRlsStorage(req);
      const clientId = parseInt(req.query.clientId as string) || (await rlsStorage.getClientByUserId(user.id))?.id;
      
      if (user.role !== 'admin' && !clientId) {
        return res.status(400).json({ message: 'Client profile not found' });
      }
      
      // RLS will handle authorization checks, but we still do explicit checks for transparency
      if (user.role !== 'admin' && (await rlsStorage.getClientByUserId(user.id))?.id !== clientId) {
        return res.status(403).json({ message: 'Unauthorized to access these check-ins' });
      }
      
      const upcoming = req.query.upcoming === 'true';
      const checkins = upcoming 
        ? await rlsStorage.getUpcomingCheckinsByClientId(clientId!)
        : await rlsStorage.getCheckinsByClientId(clientId!);
      
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
      
      const rlsStorage = getRlsStorage(req);
      const checkin = await rlsStorage.updateCheckinStatus(parseInt(id), status);
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
      
      const rlsStorage = getRlsStorage(req);
      const message = await rlsStorage.createMessage(messageData);
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
        const otherUserId = req.query.otherUserId as string;
        const rlsStorage = getRlsStorage(req);
        const conversation = await rlsStorage.getConversation(userId, otherUserId);
        return res.json(conversation);
      }
      
      const rlsStorage = getRlsStorage(req);
      const messages = await rlsStorage.getMessagesByUserId(userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching messages' });
    }
  });

  apiRouter.patch('/messages/:id/read', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const rlsStorage = getRlsStorage(req);
      const message = await rlsStorage.markMessageAsRead(parseInt(id));
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
      
      const rlsStorage = getRlsStorage(req);
      const coachId = (await rlsStorage.getCoachByUserId(user.id))?.id;
      if (!coachId) {
        return res.status(400).json({ message: 'Coach profile not found' });
      }
      
      const nutritionPlanData = insertNutritionPlanSchema.parse({
        ...req.body,
        coachId
      });
      
      const nutritionPlan = await rlsStorage.createNutritionPlan(nutritionPlanData);
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
      const rlsStorage = getRlsStorage(req);
      const clientId = parseInt(req.query.clientId as string) || (await rlsStorage.getClientByUserId(user.id))?.id;
      
      if (!clientId) {
        return res.status(400).json({ message: 'Client profile not found' });
      }
      
      // RLS will handle authorization checks, but we still do explicit checks for transparency
      if (user.role !== 'admin' && (await rlsStorage.getClientByUserId(user.id))?.id !== clientId) {
        return res.status(403).json({ message: 'Unauthorized to access these nutrition plans' });
      }
      
      const currentOnly = req.query.current === 'true';
      
      if (currentOnly) {
        const currentPlan = await rlsStorage.getCurrentNutritionPlan(clientId);
        return res.json(currentPlan || null);
      }
      
      const nutritionPlans = await rlsStorage.getNutritionPlansByClientId(clientId);
      res.json(nutritionPlans);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching nutrition plans' });
    }
  });

  // Device integration routes
  apiRouter.get('/integrations', isAuthenticated, async (req, res) => {
    try {
      const rlsStorage = getRlsStorage(req);
      const integrations = await rlsStorage.getDeviceIntegrationsByUserId((req.user as any).id);
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching integrations' });
    }
  });

  apiRouter.post('/integrations', isAuthenticated, async (req, res) => {
    try {
      const integrationData = {
        ...req.body,
        userId: (req.user as any).id
      };
      
      const rlsStorage = getRlsStorage(req);
      // Check if integration already exists
      const existingIntegration = await rlsStorage.getDeviceIntegrationByUserId(
        (req.user as any).id, 
        integrationData.provider
      );
      
      if (existingIntegration) {
        // Update existing integration
        const updated = await rlsStorage.updateDeviceIntegration(
          existingIntegration.id,
          integrationData
        );
        return res.json(updated);
      }
      
      // Create new integration
      const created = await rlsStorage.createDeviceIntegration(integrationData);
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ message: 'Server error creating integration' });
    }
  });

  apiRouter.delete('/integrations/:id', isAuthenticated, async (req, res) => {
    try {
      const integrationId = parseInt(req.params.id);
      
      const rlsStorage = getRlsStorage(req);
      // Check if integration exists and belongs to user
      const integrations = await rlsStorage.getDeviceIntegrationsByUserId((req.user as any).id);
      const userOwnsIntegration = integrations.some(i => i.id === integrationId);
      
      if (!userOwnsIntegration) {
        return res.status(403).json({ message: 'Unauthorized to delete this integration' });
      }
      
      await rlsStorage.deleteDeviceIntegration(integrationId);
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
      
      // For webhook, we need to use service account or admin token for RLS
      // Since webhooks don't have user context, we'll use the admin token
      const rlsStorage = new SupabaseStorage(); // Admin context for webhook
      
      // Verify the token matches the stored token for this integration
      const integration = await rlsStorage.getDeviceIntegrationByUserId(
        userId, 
        'feelfit'
      );
      
      if (!integration || integration.accessToken !== token) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      // Get the client associated with this user
      const client = await rlsStorage.getClientByUserId(userId);
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Create a new weight log from the Feelfit data
      const weightLog = {
        clientId: client.id,
        weight: parseFloat(weight).toString(),
        date: new Date(timestamp).toISOString().split('T')[0],
        notes: 'Recorded from Feelfit scale'
      };
      
      const created = await rlsStorage.createWeightLog(weightLog);
      
      // Update the integration's last synced timestamp
      await rlsStorage.updateDeviceIntegration(integration.id, {
        lastSyncedAt: new Date(),
      });
      
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      console.error('Feelfit webhook error:', error);
      res.status(500).json({ message: 'Server error processing Feelfit data' });
    }
  });

  // Exercise management routes
  apiRouter.get('/exercises', isAuthenticated, async (req, res) => {
    try {
      const rlsStorage = getRlsStorage(req);
      const exercises = await rlsStorage.getExercises();
      res.json(exercises);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching exercises' });
    }
  });

  apiRouter.post('/exercises', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Only coaches can create exercises' });
      }

      const rlsStorage = getRlsStorage(req);
      const exerciseData = insertExerciseSchema.parse({
        ...req.body,
        createdBy: user.id
      });

      const exercise = await rlsStorage.createExercise(exerciseData);
      res.status(201).json(exercise);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error creating exercise' });
    }
  });

  // Program management routes
  apiRouter.get('/programs', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      let programs;

      const rlsStorage = getRlsStorage(req);
      if (user.role === 'admin') {
        programs = await rlsStorage.getProgramsByCoachId(user.id);
      } else {
        programs = await rlsStorage.getPrograms();
      }

      res.json(programs);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching programs' });
    }
  });

  apiRouter.post('/programs', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Only coaches can create programs' });
      }

      const rlsStorage = getRlsStorage(req);
      const programData = insertProgramSchema.parse({
        ...req.body,
        coachId: user.id
      });

      const program = await rlsStorage.createProgram(programData);
      res.status(201).json(program);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error creating program' });
    }
  });

  // Program assignment routes
  apiRouter.post('/programs/:id/assign', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Only coaches can assign programs' });
      }

      const programId = parseInt(req.params.id);
      const { clientIds, startDate, notes } = req.body;

      if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
        return res.status(400).json({ message: 'Client IDs are required' });
      }

      const assignments = [];
      for (const clientId of clientIds) {
        const assignmentData = insertClientProgramSchema.parse({
          clientId: parseInt(clientId),
          programId,
          assignedBy: user.id,
          startDate,
          notes
        });

        const rlsStorage = getRlsStorage(req);
        const assignment = await rlsStorage.assignProgramToClient(assignmentData);
        assignments.push(assignment);
      }

      res.status(201).json(assignments);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error assigning program' });
    }
  });

  // Workout management routes
  apiRouter.get('/workouts', isAuthenticated, async (req, res) => {
    try {
      const programId = req.query.programId as string;
      let workouts;

      const rlsStorage = getRlsStorage(req);
      if (programId) {
        workouts = await rlsStorage.getWorkoutsByProgramId(parseInt(programId));
      } else {
        workouts = await rlsStorage.getWorkouts();
      }

      res.json(workouts);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching workouts' });
    }
  });

  apiRouter.post('/workouts', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Only coaches can create workouts' });
      }

      const { workout, exercises } = req.body;

      const rlsStorage = getRlsStorage(req);
      const workoutData = insertWorkoutSchema.parse(workout);
      const createdWorkout = await rlsStorage.createWorkout(workoutData);

      // Add exercises to the workout
      if (exercises && Array.isArray(exercises)) {
        for (const exercise of exercises) {
          const exerciseData = insertWorkoutExerciseSchema.parse({
            ...exercise,
            workoutId: createdWorkout.id
          });
          await rlsStorage.createWorkoutExercise(exerciseData);
        }
      }

      res.status(201).json(createdWorkout);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error creating workout' });
    }
  });

  // Client program assignments (for client view)
  apiRouter.get('/client-programs', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      let clientPrograms;

      const rlsStorage = getRlsStorage(req);
      if (user.role === 'admin') {
        // Coach viewing all their assigned programs
        clientPrograms = await rlsStorage.getClientProgramsByCoachId(user.id);
      } else {
        // Client viewing their own programs
        clientPrograms = await rlsStorage.getClientPrograms(user.id);
      }

      res.json(clientPrograms);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching client programs' });
    }
  });

  // Workout log management
  apiRouter.post('/workout-logs', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      const rlsStorage = getRlsStorage(req);
      const workoutLogData = insertWorkoutLogSchema.parse({
        ...req.body,
        clientId: user.id
      });

      const workoutLog = await rlsStorage.createWorkoutLog(workoutLogData);
      res.status(201).json(workoutLog);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error creating workout log' });
    }
  });

  apiRouter.get('/workout-logs', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const clientId = parseInt(req.query.clientId as string) || user.id;

      const rlsStorage = getRlsStorage(req);
      // RLS will handle authorization checks, but we still do explicit checks for transparency
      if (user.role !== 'admin' && clientId !== user.id) {
        return res.status(403).json({ message: 'Unauthorized to access these workout logs' });
      }

      const workoutLogs = await rlsStorage.getWorkoutLogsByClientId(clientId);
      
      // Enhance workout logs with full workout details
      const enhancedLogs = await Promise.all(workoutLogs.map(async (log) => {
        const workout = await rlsStorage.getWorkout(log.workoutId);
        const workoutExercises = await rlsStorage.getWorkoutExercisesByWorkoutId(log.workoutId);
        
        // Get exercise details for each workout exercise
        const enhancedExercises = await Promise.all(workoutExercises.map(async (we) => {
          const exercise = await rlsStorage.getExercise(we.exerciseId);
          return {
            ...we,
            exercise
          };
        }));

        return {
          ...log,
          workout: {
            ...workout,
            workout_exercises: enhancedExercises
          }
        };
      }));

      res.json(enhancedLogs);
    } catch (error) {
      console.error('Error fetching workout logs:', error);
      res.status(500).json({ message: 'Server error fetching workout logs' });
    }
  });

  // Client management endpoints
  apiRouter.post('/clients', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Only coaches/admins can add clients
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Only coaches can add clients' });
      }

      const { firstName, lastName, email, phone, packageType, goals, notes } = req.body;

      if (!firstName || !lastName || !email || !packageType) {
        return res.status(400).json({ message: 'First name, last name, email, and package type are required' });
      }

      // Extract JWT token for RLS enforcement
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace(/^Bearer\s+/i, '').replace(/^"(.*)"$/, '$1');
      
      if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ message: 'Valid JWT token required for RLS enforcement' });
      }

      // Use RLS-aware storage with JWT token for security
      const rlsStorage = SupabaseStorage.withUserToken(token);

      // Check if user with this email already exists
      const existingUser = await rlsStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Create user account for the client
      const hashedPassword = await bcrypt.hash('defaultpassword123', 10); // Temporary password
      const userData = {
        username: `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'client' as const
      };

      const newUser = await rlsStorage.createUser(userData);

      // Get the coach ID for the authenticated user (with RLS)
      const coach = await rlsStorage.getCoachByUserId(user.id);
      if (!coach) {
        return res.status(400).json({ message: 'Coach profile not found. Please contact support.' });
      }

      // Create client profile with proper audit trail (RLS-enforced)
      const clientData = {
        userId: newUser.id, // This is now a UUID string
        coachId: coach.id, // Assign client to the creating coach
        phone: phone || null,
        packageType,
        goals: goals || null,
        notes: notes || null,
        createdBy: user.id // Track who created this client
      };

      const client = await rlsStorage.createClient(clientData);

      res.status(201).json({
        success: true,
        client: {
          id: client.id,
          user: { ...newUser, password: undefined },
          ...clientData
        }
      });
    } catch (error: any) {
      console.error('Error creating client:', error);
      res.status(500).json({ message: 'Server error creating client', error: error.message });
    }
  });

  apiRouter.get('/clients', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Only coaches/admins can view all clients
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Only coaches can view all clients' });
      }

      // Extract JWT token for RLS enforcement
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace(/^Bearer\s+/i, '').replace(/^"(.*)"$/, '$1');
      
      if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ message: 'Valid JWT token required for RLS enforcement' });
      }

      // Use RLS-aware storage with JWT token
      const rlsStorage = SupabaseStorage.withUserToken(token);
      const clients = await rlsStorage.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ message: 'Server error fetching clients' });
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

  // Simple frontend for testing
  app.get('/simple', (req, res) => {
    res.sendFile('/Users/robertopita/SNPClientDashboard/simple-frontend.html');
  });

  // Mount API routes
  app.use('/api', apiRouter);
  
  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  const httpServer = createServer(app);
  return httpServer;
}
