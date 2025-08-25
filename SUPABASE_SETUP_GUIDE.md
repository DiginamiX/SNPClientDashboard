# Supabase MCP Integration Setup Guide

## 🎯 Overview

This guide will help you set up Supabase MCP (Model Context Protocol) integration for your Enhanced Coaching Platform. You have two options: **Local Development** or **Remote Supabase Project**.

## 📋 Prerequisites

### For Local Development:
- [Docker Desktop](https://docs.docker.com/desktop/) (Required)
- Supabase CLI (✅ Already installed)

### For Remote Development:
- Supabase account (free tier available)
- Internet connection

---

## 🚀 Option 1: Local Development Setup (Recommended for Development)

### Step 1: Install Docker Desktop
1. Download Docker Desktop from: https://docs.docker.com/desktop/
2. Install and start Docker Desktop
3. Verify installation: `docker --version`

### Step 2: Start Local Supabase
```bash
# Start all Supabase services locally
supabase start

# This will start:
# - PostgreSQL database
# - Supabase Studio (Web UI)
# - Authentication service
# - Storage service
# - Edge Functions runtime
```

### Step 3: Apply Database Migrations
```bash
# Reset database and apply all migrations
supabase db reset

# Or apply migrations incrementally
supabase db push
```

### Step 4: Access Supabase Studio
- Open: http://localhost:54323
- Default credentials will be displayed in terminal

---

## 🌐 Option 2: Remote Supabase Project (Recommended for Production)

### Step 1: Create Supabase Project
1. Go to https://app.supabase.com
2. Click "New Project"
3. Choose organization (or create one)
4. Project settings:
   - **Name**: enhanced-coaching-platform
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Cape Town (closest to South Africa)
   - **Pricing**: Free tier (500MB DB + 1GB storage)

### Step 2: Get Project Credentials
After project creation, go to Settings > API:
- **Project URL**: `https://your-project-ref.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep secret!)

### Step 3: Link Local Project to Remote
```bash
# Login to Supabase CLI
supabase login

# Link to your remote project
supabase link --project-ref YOUR_PROJECT_REF

# Push local schema to remote
supabase db push
```

---

## 🔧 Environment Configuration

### Update .env file:
```bash
# For Local Development
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# For Remote Production
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-from-dashboard
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-dashboard
```

### Update client environment:
Create `client/.env.local`:
```bash
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

---

## 🧪 Testing Your Setup

### Run Connection Test:
```bash
# Test Supabase connection
npx tsx scripts/test-supabase-connection.ts
```

### Expected Output:
```
🔧 Testing Supabase connection...
📍 Supabase URL: http://localhost:54321

1. Testing basic connection...
✅ Database connection successful

2. Testing authentication service...
✅ Authentication service ready

3. Testing real-time capabilities...
✅ Real-time capabilities ready

4. Testing database helper functions...
✅ Database helper functions working

5. Testing storage access...
✅ Storage access ready

🎉 Supabase integration test completed!
```

---

## 📊 Database Schema Overview

Your enhanced coaching platform includes these tables:

### Core Tables:
- `users` - User profiles (extends Supabase auth)
- `coaches` - Coach-specific data
- `clients` - Client profiles and goals
- `coach_clients` - Coach-client relationships

### Workout System:
- `exercises` - Exercise library with videos
- `programs` - Workout programs
- `workouts` - Individual workouts
- `workout_exercises` - Exercises within workouts
- `client_programs` - Program assignments
- `workout_logs` - Workout completion tracking
- `exercise_logs` - Exercise performance data

### Nutrition System:
- `meal_plans` - Meal plan templates
- `meals` - Individual meals
- `client_meal_plans` - Meal plan assignments
- `nutrition_plans` - Legacy nutrition tracking

### Progress Tracking:
- `weight_logs` - Weight tracking
- `progress_photos` - Photo progress
- `body_measurements` - Comprehensive measurements
- `checkins` - Coach-client check-ins

### Communication:
- `messages` - Real-time messaging
- `device_integrations` - External app connections

---

## 🔐 Security Features

### Row Level Security (RLS):
- ✅ Users can only see their own data
- ✅ Coaches can only see assigned clients
- ✅ Public exercises vs private exercises
- ✅ Message privacy between sender/recipient

### Real-time Subscriptions:
- ✅ Live messaging
- ✅ Workout progress updates
- ✅ Progress photo notifications
- ✅ Weight log updates

---

## 🚀 Production Deployment

### Step 1: Create Production Project
Follow "Option 2" above with production settings

### Step 2: Configure Production Environment
```bash
# Production .env
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-key
```

### Step 3: Deploy Schema
```bash
# Link to production project
supabase link --project-ref YOUR_PROD_PROJECT_REF

# Deploy migrations
supabase db push
```

### Step 4: Set up Storage Buckets
In Supabase Dashboard > Storage:
1. Create bucket: `exercise-videos`
2. Create bucket: `progress-photos`
3. Create bucket: `meal-photos`
4. Configure RLS policies for each bucket

---

## 📋 Development Workflow

### Daily Development:
```bash
# Start local services
supabase start

# Start your app
npm run dev

# View database in browser
open http://localhost:54323
```

### Making Schema Changes:
```bash
# Create new migration
supabase migration new your_change_name

# Edit the generated SQL file
# Then apply changes
supabase db reset
```

### Deploying Changes:
```bash
# Push to remote
supabase db push

# Generate updated TypeScript types
supabase gen types typescript --remote > shared/supabase-types.ts
```

---

## 🔧 Troubleshooting

### Common Issues:

#### Docker not running:
```bash
# Check Docker status
docker --version
docker ps

# Start Docker Desktop application
```

#### Connection refused:
```bash
# Check Supabase status
supabase status

# Restart services
supabase stop
supabase start
```

#### Migration errors:
```bash
# Reset database completely
supabase db reset

# Or check migration files for syntax errors
```

#### Environment variables not loaded:
```bash
# Check .env files exist
ls -la .env*
cat .env

# Restart development server
npm run dev
```

---

## 📞 Support

### Resources:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)

### Next Steps:
1. Choose local or remote setup
2. Install Docker Desktop (if local)
3. Configure environment variables
4. Run connection test
5. Start building real-time features! 🚀

---

## 🎯 Integration Benefits

Once setup is complete, you'll have:

- ✅ **Real-time messaging** between coaches and clients
- ✅ **Live workout tracking** with progress updates
- ✅ **Automatic API generation** from your schema
- ✅ **Row-level security** for multi-tenant architecture
- ✅ **Built-in authentication** with social logins
- ✅ **File storage** for videos and images
- ✅ **Edge functions** for serverless operations
- ✅ **Database backups** and point-in-time recovery

Your enhanced coaching platform will be production-ready and scalable! 🎉
