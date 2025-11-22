# NextGen Messenger

## Overview

NextGen Messenger is a real-time messaging platform inspired by Telegram's clean and functional interface. The application enables users to communicate through direct messages, manage friend relationships, and maintain presence awareness. Built as a full-stack web application, it emphasizes communication efficiency and information density while maintaining a modern, responsive user experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack React Query for server state management and caching

**UI Component System:**
- shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Custom theme system supporting light/dark modes with CSS variables
- Typography hierarchy using Inter (primary) and JetBrains Mono (monospace)

**State Management:**
- React Context API for authentication state
- TanStack Query for server-side state with automatic cache invalidation
- WebSocket connection maintained at component level for real-time updates

**Layout Strategy:**
- Responsive three-tier layout: Sidebar (280px) | Conversation List (360px) | Chat Area (flex)
- Collapses to two-column on tablet and single-column on mobile
- Navigation states managed through view switching (chats/contacts/requests)

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript for API routes and middleware
- Session-based authentication using express-session with MemoryStore
- WebSocket server (ws library) for real-time bidirectional communication
- Separate development and production entry points for different serving strategies

**API Design:**
- RESTful endpoints for CRUD operations on users, friendships, and messages
- WebSocket events for real-time message delivery and presence updates
- Session-based authentication protecting all API routes
- Password hashing with bcrypt (10 rounds)

**Real-time Communication:**
- WebSocket connections mapped to user IDs for targeted message delivery
- Presence tracking through connection/disconnection events
- Message broadcasting to specific users based on friendship relationships
- Automatic status updates (online/offline) tied to WebSocket lifecycle

### Data Storage

**Database:**
- PostgreSQL via Neon serverless driver
- Drizzle ORM for type-safe database queries and migrations
- Connection pooling for efficient database resource management

**Schema Design:**
- `users`: Core user accounts with credentials, status, and last seen timestamp
- `friendships`: Bidirectional relationships with status tracking (pending/accepted)
- `messages`: Direct messages between users with read status and timestamps
- UUID primary keys generated at database level
- Cascade deletes for referential integrity

**Data Access Layer:**
- Repository pattern (DatabaseStorage class) abstracts database operations
- Type-safe queries using Drizzle ORM with schema inference
- Relationship queries optimized for conversation list and message retrieval

### Authentication & Authorization

**Session Management:**
- Cookie-based sessions with configurable secret
- Session data stored in-memory (MemoryStore) with 24-hour cleanup cycle
- HttpOnly cookies for security
- User ID stored in session upon successful login/registration

**Security Measures:**
- Password hashing with bcrypt before storage
- Username uniqueness enforced at database level
- Protected routes require valid session
- CSRF protection through same-origin cookie policy

### Design System

**Visual Design:**
- Telegram-inspired interface prioritizing information density
- Custom color system with semantic tokens (primary, secondary, accent, destructive)
- Border radius scale: 9px (lg), 6px (md), 3px (sm)
- Elevation system using subtle shadows and alpha-based overlays
- Consistent spacing using Tailwind's spacing scale (2, 3, 4, 6, 8)

**Component Patterns:**
- Avatar system with status indicators (online/offline dots)
- Card-based layouts for conversation items and friend requests
- Badge components for unread counts
- Scroll areas for long lists with custom scrollbar styling

## External Dependencies

**Core Infrastructure:**
- Neon Database: Serverless PostgreSQL hosting
- WebSocket Protocol: Real-time bidirectional communication

**Build & Development:**
- Vite: Frontend build tooling and hot module replacement
- Replit-specific plugins: Runtime error overlay, cartographer, dev banner

**UI Framework:**
- Radix UI: Accessible component primitives (20+ components)
- Tailwind CSS: Utility-first CSS framework
- Lucide React: Icon library

**Data & Forms:**
- React Hook Form: Form state management
- Zod: Schema validation
- date-fns: Date formatting and manipulation

**Database:**
- Drizzle ORM: Type-safe database queries
- Drizzle Kit: Migration management
- pg (via Neon): PostgreSQL driver

**Authentication:**
- bcrypt: Password hashing
- express-session: Session middleware
- connect-pg-simple: PostgreSQL session store (available but using MemoryStore)

**State Management:**
- TanStack React Query: Server state and caching
- React Context: Authentication context

**API Integration:**
- UI Avatars API: Dynamic avatar generation based on usernames