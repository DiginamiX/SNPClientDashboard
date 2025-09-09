import express, { Request, Response, Router } from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
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
import rateLimit from "express-rate-limit";
import { createClient } from '@supabase/supabase-js';

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
const supabaseUrl = process.env.SUPABASE_URL || 'https://vdykrlyybwwbcqqcgjbp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeWtybHl5Ynd3YmNxcWNnamJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEzNjY3MCwiZXhwIjoyMDcxNzEyNjcwfQ.fYLdoULJWBQyrmH4DFLnq8CtHhq5xE4VChNsJHKJz2k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
  max: 100, // Limit each IP to 100 requests per windowMs for general endpoints
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Add CORS headers for mobile compatibility
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
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

  // No session setup needed - using Supabase JWT tokens

  // Create API router
  const apiRouter = Router();

  // Supabase JWT Authentication middleware
  const isAuthenticated = async (req: Request, res: Response, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized - No token provided' });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Verify the JWT token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        console.log('❌ Auth verification failed:', error?.message);
        return res.status(401).json({ message: 'Unauthorized - Invalid token' });
      }

      // Attach user info to request
      (req as any).user = {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'client',
        firstName: user.user_metadata?.first_name,
        lastName: user.user_metadata?.last_name
      };

      console.log('✅ User authenticated:', { 
        id: user.id, 
        email: user.email, 
        role: user.user_metadata?.role 
      });

      next();
    } catch (error) {
      console.log('❌ Auth middleware error:', error);
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

  // Apply rate limiting to auth routes
  apiRouter.use('/auth', authRateLimit);
  
  // Apply general rate limiting to all other API routes
  apiRouter.use(generalRateLimit);
  
  // Test endpoint to verify database connectivity
  apiRouter.get('/test/db', async (req, res) => {
    try {
      // Simple database test without using our schema
      const postgres = (await import('postgres')).default;
      const client = postgres(process.env.DATABASE_URL, { prepare: false });
      const result = await client`SELECT COUNT(*) as count FROM users`;
      await client.end();
      
      res.json({ 
        success: true, 
        message: 'Database connection working',
        userCount: result[0].count,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Database connection failed',
        error: error.message 
      });
    }
  });
  
  // Simple registration endpoint that bypasses Drizzle ORM issues
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
      
      // Create session manually
      req.session.userId = mockUser.id;
      req.session.user = mockUser;
      
      const duration = Date.now() - startTime;
      console.log(`✅ Demo registration completed in ${duration}ms`);
      
      res.json({ 
        success: true,
        user: mockUser,
        message: 'Registration successful (demo mode - user created in session only)'
      });
      
    } catch (error) {
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
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeWtybHl5Ynd3YmNxcWNnamJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMzY2NzAsImV4cCI6MjA3MTcxMjY3MH0.McnQU03YULVB_dcwIa4QNmXml5YmTpOefa1ySkvBVEA';
      
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
      
      // Create session manually for immediate login
      const user = {
        id: data.user?.id,
        username,
        email: data.user?.email || email,
        first_name: firstName,
        last_name: lastName,
        role: role || 'client',
        created_at: data.user?.created_at
      };
      
      req.session.userId = user.id;
      req.session.user = user;
      
      const duration = Date.now() - startTime;
      console.log(`✅ Supabase registration completed in ${duration}ms`);
      
      res.status(201).json({ 
        success: true,
        user: user
      });
      
    } catch (error) {
      console.log('❌ Registration error:', error.message);
      res.status(500).json({ message: 'Registration failed', error: error.message });
    }
  });

  apiRouter.post('/auth/register-simple', async (req, res) => {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Simple registration attempt:', { 
        email: req.body.email, 
        username: req.body.username,
        role: req.body.role 
      });
      
      const { username, email, password, firstName, lastName, role } = req.body;
      
      // Validate required fields
      if (!username || !email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'All fields are required' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('✅ Password hashed');
      
      // Create user directly with postgres
      const postgres = (await import('postgres')).default;
      const client = postgres(process.env.DATABASE_URL, { prepare: false });
      
      // Check if user exists
      const existingUser = await client`
        SELECT id FROM users WHERE email = ${email} OR username = ${username}
      `;
      
      if (existingUser.length > 0) {
        await client.end();
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Try to insert user, let database generate UUID if possible
      let result;
      try {
        // First try without explicit ID (let database generate)
        result = await client`
          INSERT INTO users (username, email, first_name, last_name, role)
          VALUES (${username}, ${email}, ${firstName}, ${lastName}, ${role || 'client'})
          RETURNING id, username, email, first_name, last_name, role, created_at
        `;
      } catch (error) {
        if (error.message.includes('null value in column "id"')) {
          // If database doesn't auto-generate, create UUID manually
          const userId = crypto.randomUUID();
          result = await client`
            INSERT INTO users (id, username, email, first_name, last_name, role)
            VALUES (${userId}, ${username}, ${email}, ${firstName}, ${lastName}, ${role || 'client'})
            RETURNING id, username, email, first_name, last_name, role, created_at
          `;
        } else {
          throw error; // Re-throw if it's a different error
        }
      }
      
      await client.end();
      
      const user = result[0];
      console.log('✅ User created:', { id: user.id, email: user.email });
      
      // Create a session manually
      req.session.userId = user.id;
      req.session.user = user;
      
      const duration = Date.now() - startTime;
      console.log(`✅ Simple registration completed in ${duration}ms`);
      
      res.status(201).json({ 
        success: true,
        user: user
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ Simple registration failed after ${duration}ms:`, error.message);
      res.status(500).json({ message: 'Registration failed', error: error.message });
    }
  });
  
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
      const userData = insertUserSchema.parse(req.body);
        
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
        const clientData = insertClientSchema.parse({
          userId: user.id,
          ...req.body.clientData
        });
        await storage.createClient(clientData);
          console.log('✅ Client profile created');
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
      
      // Log in the user after registration
      req.login(user, (err) => {
        if (err) {
            console.log('❌ Login after registration failed:', err.message);
          return res.status(500).json({ message: 'Error during login after registration' });
        }
          
          const duration = Date.now() - startTime;
          console.log(`✅ Registration completed in ${duration}ms`);
        return res.status(201).json({ user: { ...user, password: undefined } });
      });
      })();
      
      // Race between registration and timeout
      await Promise.race([registrationPromise, timeoutPromise]);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ Registration failed after ${duration}ms:`, error.message);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error during registration' });
    }
  });

  // Demo endpoint to get current user from session
  apiRouter.get('/auth/me', async (req, res) => {
    try {
      console.log('🔍 Checking current user session:', { 
        userId: req.session?.userId, 
        hasUser: !!req.session?.user 
      });
      
      if (req.session?.user) {
        console.log('✅ User found in session:', { 
          id: req.session.user.id, 
          username: req.session.user.username,
          role: req.session.user.role 
        });
        res.json({ user: req.session.user });
      } else {
        console.log('❌ No user in session');
        res.status(401).json({ message: 'Not authenticated' });
      }
    } catch (error) {
      console.log('❌ Session check failed:', error.message);
      res.status(500).json({ message: 'Session check failed', error: error.message });
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
      
      // Create session manually
      req.session.userId = mockUser.id;
      req.session.user = mockUser;
      
      const duration = Date.now() - startTime;
      console.log(`✅ Demo login completed in ${duration}ms`);
      
      res.json({ 
        success: true,
        user: mockUser
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ Demo login failed after ${duration}ms:`, error.message);
      res.status(500).json({ message: 'Login failed', error: error.message });
    }
  });

  // Simple login endpoint that works with our database structure
  apiRouter.post('/auth/login-simple', async (req, res) => {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Simple login attempt:', { username: req.body.username });
      
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      // Query user directly with postgres
      const postgres = (await import('postgres')).default;
      const client = postgres(process.env.DATABASE_URL, { prepare: false });
      
      const users = await client`
        SELECT id, username, email, first_name, last_name, role, created_at
        FROM users 
        WHERE username = ${username}
      `;
      
      if (users.length === 0) {
        await client.end();
        console.log('❌ User not found:', username);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const user = users[0];
      console.log('✅ User found:', { id: user.id, email: user.email, role: user.role });
      
      // Note: For demo purposes, we'll skip password verification
      // In production, you'd verify the hashed password here
      
      await client.end();
      
      // Create session manually
      req.session.userId = user.id;
      req.session.user = user;
      
      const duration = Date.now() - startTime;
      console.log(`✅ Simple login completed in ${duration}ms`);
      
      res.json({ 
        success: true,
        user: user
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ Simple login failed after ${duration}ms:`, error.message);
      res.status(500).json({ message: 'Login failed', error: error.message });
    }
  });

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
        client = await storage.createClient(clientData);
        if (!client) {
          return res.status(500).json({ message: 'Failed to create client profile' });
        }
      } else {
        // Get the client again or use the one we already have
        client = await storage.getClientByUserId(user.id);
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
      
      const checkin = await storage.createCheckin(checkinData);
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
        ? await storage.getUpcomingCheckinsByClientId(clientId!)
        : await storage.getCheckinsByClientId(clientId!);
      
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
      const integrations = await storage.getDeviceIntegrationsByUserId((req.user as any).id);
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
      
      // Check if integration already exists
      const existingIntegration = await storage.getDeviceIntegrationByUserId(
        (req.user as any).id, 
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
      const integrations = await storage.getDeviceIntegrationsByUserId((req.user as any).id);
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
        weight: parseFloat(weight).toString(),
        date: new Date(timestamp).toISOString().split('T')[0],
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
