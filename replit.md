# EmotionWeather

## Overview

EmotionWeather is a full-stack web application that enables citizens to provide feedback on government policies through emoji-based voting reactions. The platform allows users to express their sentiments about policies using four emotion types: happy, angry, neutral, and suggestions. The application provides real-time visualization of public opinion through interactive maps, live voting results, and AI-powered sentiment analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Styling**: TailwindCSS with shadcn/ui component library using the "new-york" style theme
- **Routing**: Wouter for lightweight client-side routing with five main pages (Dashboard, Voting, Emotion Map, AI Summary, Manage)
- **State Management**: TanStack Query (React Query) for server state management with custom query client configuration
- **Form Handling**: React Hook Form with Zod validation for type-safe form schemas
- **UI Components**: Radix UI primitives wrapped in shadcn/ui components for accessibility and consistency

### Backend Architecture
- **Runtime**: Node.js with Express.js server using ES modules
- **Language**: TypeScript with strict type checking across shared schemas
- **API Design**: RESTful API with endpoints for policies, votes, comments, and statistics
- **Middleware**: Custom logging middleware for API request tracking with duration and response capture
- **Error Handling**: Centralized error handling middleware with proper HTTP status codes
- **Development**: Vite integration for HMR and development server with runtime error overlay

### Data Storage Solutions
- **Database**: PostgreSQL configured through Neon Database (serverless)
- **ORM**: Drizzle ORM with type-safe schema definitions and migrations
- **Schema Management**: Drizzle Kit for database operations and migrations
- **Fallback Storage**: In-memory MemStorage class implementing IStorage interface for development
- **Data Types**: Structured schemas for policies, votes, comments, and users with proper relationships

### Authentication and Authorization
- **Session Management**: PostgreSQL session storage configured with connect-pg-simple
- **User Schema**: Basic user structure defined but authentication flows not fully implemented
- **Future Implementation**: Framework prepared for role-based access control and user authentication

## External Dependencies

### Database and Storage
- **Neon Database**: PostgreSQL serverless database for production data storage
- **Drizzle ORM**: Type-safe database operations with @neondatabase/serverless driver

### UI and Design System
- **Radix UI**: Comprehensive set of unstyled, accessible UI primitives
- **shadcn/ui**: Pre-built component library with consistent design tokens
- **TailwindCSS**: Utility-first CSS framework with custom theme configuration
- **Lucide React**: Icon library for consistent iconography

### Development and Build Tools
- **Vite**: Fast build tool with HMR and development server
- **Replit Integration**: Runtime error overlay and cartographer for development environment
- **TypeScript**: Full-stack type safety with shared schemas

### Data Visualization
- **Recharts**: Chart library for voting statistics and data visualization
- **Leaflet**: Interactive mapping library for geographical emotion visualization

### External Services
- **Google Fonts**: Web fonts including Inter, Architects Daughter, DM Sans, Fira Code, and Geist Mono
- **CDN Resources**: Leaflet CSS and marker assets via CDN for mapping functionality

The application follows a monorepo structure with shared TypeScript schemas between frontend and backend, ensuring type safety across the full stack. The system uses polling-based queries for real-time updates and implements a comprehensive error handling strategy with user-friendly toast notifications.