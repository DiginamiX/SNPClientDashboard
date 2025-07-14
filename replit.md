# replit.md

## Overview

This is a full-stack fitness coaching client portal application built with React (frontend) and Express.js (backend). The application allows fitness clients to track their weight, upload progress photos, schedule check-ins with coaches, exchange messages, and view nutrition plans. It uses a modern tech stack with TypeScript, Drizzle ORM, PostgreSQL, and shadcn/ui components.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite for development and production builds
- **Theme Support**: next-themes for dark/light mode switching

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy and bcrypt for password hashing
- **Session Management**: Express sessions with memory store
- **File Uploads**: Multer for handling progress photo uploads
- **API Design**: RESTful API with JSON responses

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Connection**: Neon serverless PostgreSQL database
- **Migrations**: Drizzle Kit for database schema management
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`

## Key Components

### Authentication System
- User registration and login with username/password
- Role-based access control (client/admin roles)
- Session-based authentication with secure cookie handling
- Password encryption using bcryptjs

### Core Features
1. **Dashboard**: Overview of user stats, weight charts, recent photos, and upcoming check-ins
2. **Weight Tracking**: Log daily weights with charts and progress visualization
3. **Progress Photos**: Upload and categorize progress photos with date tracking
4. **Check-ins**: Schedule and manage appointments with coaches
5. **Messages**: Real-time messaging system between clients and coaches
6. **Meal Plans**: View and manage nutrition plans from coaches
7. **Settings**: Profile management and preferences

### UI Components
- Comprehensive shadcn/ui component library
- Responsive design with mobile-first approach
- Dark/light theme support
- Form validation with react-hook-form and Zod
- Charts using Chart.js for data visualization

## Data Flow

1. **Authentication Flow**: Login → Session creation → Role-based route protection
2. **Data Fetching**: TanStack Query handles API calls with caching and error handling
3. **Form Submissions**: React Hook Form → Zod validation → API requests → Database updates
4. **File Uploads**: Multer middleware → Local file storage → Database URL references
5. **Real-time Updates**: Query invalidation and refetching for live data updates

## External Dependencies

### Frontend Dependencies
- React ecosystem (react, react-dom, react-router)
- TanStack Query for server state management
- Radix UI primitives for accessible components
- Chart.js for data visualization
- date-fns for date manipulation
- Tailwind CSS for styling

### Backend Dependencies
- Express.js for server framework
- Drizzle ORM for database operations
- Passport.js for authentication
- bcryptjs for password hashing
- Multer for file uploads
- Neon serverless for PostgreSQL connection

### Development Dependencies
- TypeScript for type safety
- Vite for build tooling
- ESBuild for server bundling
- Drizzle Kit for database migrations

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds static assets to `/dist/public`
- **Backend**: ESBuild bundles server code to `/dist/index.js`
- **Database**: Drizzle migrations applied via `db:push` command

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- Development vs production modes supported
- Replit-specific plugins for development environment

### File Structure
- `/client` - React frontend application
- `/server` - Express.js backend application
- `/shared` - Shared TypeScript types and database schema
- `/uploads` - User-uploaded files (progress photos)
- `/dist` - Production build output

The application follows a monorepo structure with clear separation between frontend, backend, and shared code, making it maintainable and scalable for a fitness coaching platform.