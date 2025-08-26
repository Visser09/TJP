# Overview

TradingJournal Pro is a futures trading journal application designed specifically for prop firm traders. The application provides zero-manual journaling with AI-powered insights, clean Apple-inspired UI design, and seamless integration with Tradovate for automatic trade synchronization. Built for futures traders using prop firms like Apex, TopStep, and Take Profit Trader, it supports multiple account types (Eval, PA, Live) and provides comprehensive trading analytics, journal entries, and AI coaching features.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent, accessible design
- **Styling**: Tailwind CSS with custom design tokens following Apple-inspired dark theme aesthetics
- **State Management**: TanStack React Query for server state management with built-in caching and synchronization
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Hook-based authentication system with automatic redirect handling

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Authentication**: Replit-based OAuth integration with session management using express-session
- **API Design**: RESTful endpoints with comprehensive error handling and request logging middleware
- **Database Migrations**: Drizzle Kit for schema management and migrations

## Data Storage Design
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **Schema Structure**: 
  - Users table for authentication (Replit OAuth integration)
  - Trading accounts for multi-account support (Eval, PA, Live)
  - Trades table for transaction records with P&L calculations
  - Journal entries for daily trading notes and reflections
  - Daily metrics for aggregated performance data
  - Economic events calendar for market-moving events
  - AI insights for automated coaching and pattern recognition
- **Session Storage**: PostgreSQL-backed session store for authentication persistence

## Authentication & Authorization
- **Primary Auth**: Replit OAuth with OpenID Connect
- **Session Management**: Express-session with PostgreSQL store
- **Security**: HTTP-only cookies, CSRF protection, secure session configuration
- **User Management**: Automatic user creation/update on successful OAuth flow

## Key Architectural Decisions

### Database Design Rationale
- **Multi-tenant Structure**: User-scoped data isolation with foreign key relationships ensuring data security
- **Account Flexibility**: Support for multiple trading accounts per user with different prop firms
- **Performance Optimization**: Indexed queries on frequently accessed data (user_id, dates)
- **Data Integrity**: Strong typing with Drizzle schema validation and Zod integration

### Frontend State Management
- **React Query Benefits**: Automatic background refetching, optimistic updates, and error handling
- **Component Architecture**: Separation of concerns with dedicated components for specific features
- **Error Handling**: Centralized unauthorized error detection with automatic login redirection

### API Design Philosophy
- **RESTful Conventions**: Clear endpoint naming and HTTP method usage
- **Error Standardization**: Consistent error response format across all endpoints
- **Request Validation**: Schema validation using Zod for type safety
- **Response Caching**: Appropriate cache headers for static and dynamic content

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL serverless database with connection pooling
- **Authentication**: Replit OAuth service for user authentication and profile management
- **Development**: Replit-specific development tools and runtime error overlay

## Trading Integrations
- **Tradovate API**: Planned integration for automatic trade synchronization and account data
- **Economic Calendar**: External economic events API for market-moving news integration

## UI and Design Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Consistent icon library for UI elements
- **Date-fns**: Date manipulation and formatting utilities

## Development and Build Tools
- **TypeScript**: Full type safety across frontend and backend
- **Vite**: Fast development server and optimized production builds
- **ESBuild**: Fast bundling for server-side code
- **PostCSS**: CSS processing with Autoprefixer for browser compatibility

## Data and Validation
- **Zod**: Schema validation and type inference for API requests and database operations
- **Drizzle ORM**: Type-safe database operations with automatic migration support
- **TanStack React Query**: Advanced data fetching and caching solution