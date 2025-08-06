# Overview

This is a 2D isometric simulation game built with HTML5 Canvas where players can place houses, manage NPCs, and control game world interactions. The application features a grid-based isometric world with different types of buildings (farmer, lumberjack, miner houses) and autonomous or player-controlled NPCs. The game uses geometric shapes (squares for houses, circles for NPCs) and includes virtual joysticks for mobile control and pinch-to-zoom functionality for better view control.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 18** with TypeScript for the main application framework
- **React Three Fiber (@react-three/fiber)** for 3D rendering and WebGL integration
- **React Three Drei (@react-three/drei)** for additional 3D utilities and controls
- **Vite** as the build tool and development server
- **TailwindCSS** for styling with Radix UI components for the user interface
- **Zustand** for state management with multiple specialized stores (game, house, NPC, audio)

## Backend Architecture
- **Express.js** server with TypeScript
- **In-memory storage** for user data with interface abstraction for future database integration
- RESTful API structure with `/api` prefix routing
- Middleware for request logging and error handling
- Session management ready (connect-pg-simple included for future PostgreSQL sessions)

## Data Storage Solutions
- **Drizzle ORM** configured for PostgreSQL with migration support
- **Neon Database** (@neondatabase/serverless) as the PostgreSQL provider
- Database schema defined in shared directory for type safety across frontend/backend
- Current implementation uses in-memory storage with database interface for easy migration

## Game State Management
- **Multiple Zustand stores** for different game aspects:
  - `useGameStore`: UI state, selections, modal visibility
  - `useHouseStore`: House placement and management
  - `useNPCStore`: NPC behavior, movement, and AI
  - `useAudio`: Sound effects and background music
  - `useGame`: Game phases (ready, playing, ended)
- **Grid-based positioning system** with world-to-grid coordinate conversion
- **Real-time movement system** using React Three Fiber's `useFrame` hook

## 3D Rendering Architecture
- **Custom camera system** with smooth following for selected NPCs
- **Grid-based world** with visual grid lines and cell-based positioning
- **3D models** for houses and NPCs with shadow casting/receiving
- **Animation system** for NPC movement, house selection effects, and UI feedback
- **Mobile-responsive** 3D controls with virtual joystick implementation

## Authentication and Authorization
- Basic user schema prepared with username/password fields
- Session management structure in place but not yet implemented
- Interface-based storage system ready for user authentication integration

# External Dependencies

## 3D Graphics and Game Engine
- **React Three Fiber**: Core 3D rendering
- **React Three Drei**: 3D utilities and controls
- **React Three Postprocessing**: Visual effects pipeline
- **KeyboardControls**: Input handling for game controls

## UI Component Library
- **Radix UI**: Complete set of unstyled, accessible UI primitives
- **Lucide React**: Icon library
- **Class Variance Authority**: Utility for component variants
- **TailwindCSS**: Utility-first CSS framework

## Database and Backend
- **Drizzle ORM**: Type-safe database queries
- **Neon Database**: Serverless PostgreSQL
- **Express.js**: Web server framework
- **Connect PG Simple**: PostgreSQL session store

## Development Tools
- **Vite**: Build tool with hot module replacement
- **TypeScript**: Static type checking
- **ESBuild**: Fast JavaScript bundler for production
- **TSX**: TypeScript execution for development

## State Management and Utilities
- **Zustand**: Lightweight state management
- **Nanoid**: URL-safe unique ID generator
- **React Query (@tanstack/react-query)**: Server state management
- **Date-fns**: Date utility library

## Audio and Media
- **Web Audio API**: For game sound effects and background music
- **GLSL shader support**: Via vite-plugin-glsl for custom visual effects
- **Font loading**: Inter font family via @fontsource/inter