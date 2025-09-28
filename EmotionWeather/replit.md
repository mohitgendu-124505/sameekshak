# Replit.md

## Overview

e.Sameekshak is a full-stack web application for policy feedback and voting. It allows users to view and vote on government policies using emoji-based reactions (happy, angry, neutral, or suggestions), creating an intuitive way to gauge public sentiment. The application features a clean, minimal design inspired by cord.com with a pale white theme.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS with shadcn/ui component library using the "new-york" style
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API endpoints for policies, votes, and statistics
- **Middleware**: Custom logging middleware for API request tracking
- **Error Handling**: Centralized error handling middleware

### Data Storage Solutions
- **Database**: PostgreSQL (configured via Neon serverless)
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Schema Management**: Drizzle Kit for migrations and database operations
- **In-Memory Storage**: Fallback MemStorage class for development/testing

### Authentication and Authorization
- Currently implements basic user schema structure but authentication is not fully implemented
- Session storage configured with connect-pg-simple for PostgreSQL session management

### External Dependencies
- **Database**: Neon Database (PostgreSQL serverless)
- **UI Components**: Radix UI primitives via shadcn/ui
- **Development Tools**: Replit integration with cartographer and runtime error overlay
- **Fonts**: Google Fonts (Inter, Architects Daughter, DM Sans, Fira Code, Geist Mono)

The application follows a monorepo structure with shared schema types between frontend and backend, ensuring type safety across the full stack. The system uses a polling-based approach for real-time vote updates and implements optimistic UI updates for better user experience.