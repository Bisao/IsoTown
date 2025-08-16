# Overview

This is a 2D isometric simulation game built with HTML5 Canvas where players can place houses, manage NPCs, and control game world interactions. The application features a grid-based isometric world with different types of buildings (farmer, lumberjack, miner houses) and autonomous or player-controlled NPCs. The game uses geometric shapes (squares for houses, circles for NPCs) and includes virtual joysticks for mobile control and pinch-to-zoom functionality for better view control.

## Recent Updates (August 2025)
- **Replit Migration Completed**: Successfully migrated from Replit Agent to standard Replit environment with improved security practices and client/server separation
- **Critical Bug Fixes (Aug 15)**: Fixed road sprite loading issues by converting to SVG format, enabled farmer profession system, resolved TypeScript errors in reduce functions
- **Code Quality Improvements (Aug 15)**: Completed comprehensive audit corrections including memory leak fixes in NPCManager setInterval, removal of duplicate distance calculation functions, elimination of Math.random in render loops with deterministic alternatives, cleanup of unused code, moved hardcoded constants to constants.ts, optimized useDraggable hook performance, and removed development logs
- **Complete Game Systems Audit (Aug 16)**: ✅ CONCLUÍDA - Performed comprehensive system audit identifying 21 LSP errors, excessive debug logging, potential memory leaks, and performance issues. Successfully implemented all critical fixes including complete debug log cleanup, NPC system validation improvements, and performance optimizations. Created detailed audit documentation (AUDITORIA_SISTEMAS_JOGO.md) for future reference. Game now running stably with optimized performance.
- **Enhanced Village Generation**: Improved village spacing system with significantly increased spacing (45 units) and polar coordinate distribution for more natural, realistic village placement
- **Isometric House Positioning**: Fixed house orientation to properly occupy 100% of tiles with diamond-shaped rendering for true isometric camera perspective
- **Clustered Tree Generation**: Replaced uniform tree distribution with clustered random generation system featuring tree clusters (3-7 tile radius) with varying density (60-100%) plus sparse trees for natural forest appearance
- **Proper Tile Containment**: Houses and roads now properly occupy full isometric tile space with diamond-shaped rendering that stays perfectly within tile boundaries
- **Grid Display Optimization**: Fixed grid rendering issues by expanding visible range (80 units) and clipping margins (200px) for complete visual coverage
- **PlayStation 5 Complete Integration**: Implemented comprehensive DualSense controller support with haptic feedback, adaptive trigger resistance, and PS5 browser optimizations for seamless gameplay on PlayStation 5
- **Advanced Controller Mapping**: Added full DualSense button mapping, analog stick controls, and virtual cursor navigation optimized for PS5 browser environment
- **R2 Wood Cutting Integration**: Configured DualSense R2 trigger to directly activate wood cutting action with haptic feedback intensity matching trigger pressure
- **House-to-NPC Panel Integration**: Clicking on any house now automatically opens the configuration panel for the NPC residing in that house, improving user experience
- **Stone Animation Fixes**: Resolved visual glitches where stone sprites appeared to rotate unexpectedly by implementing deterministic shape generation and eliminating random values in render loops
- **Manual NPC Actions System**: Implemented comprehensive manual control system for NPCs in controlled mode, allowing players to trigger work actions like tree cutting using keyboard controls (Space/E keys) or UI buttons
- **Enhanced NPC Interface**: Added NPCActionButtons component with real-time progress tracking, work status display, and intuitive controls for manual NPC management
- **Integrated Tree Cutting**: Connected manual actions with existing tree system, enabling controlled NPCs to cut adjacent trees with proper progress tracking and completion detection
- **Complete Miner Profession System**: Implemented full mining profession with stone collection, autonomous behavior mirroring lumberjack functionality but for stone resources
- **Tool Emoji Display**: Added visual tool emojis in NPCs' hands based on profession (🪓 for lumberjacks, ⛏️ for miners, 🚜 for farmers)
- **Comprehensive Windows 98 UI**: Applied complete Windows 98 theming to all modals including NPCConfigModal and NPCInventoryModal with proper styling, buttons, and visual elements
- **Resource-Based Inventory Management**: Implemented advanced inventory system with weight-based limitations, resource transfer between NPCs and houses, and automatic home storage at 80% capacity
- **Enhanced NPC Cooldowns**: Adjusted NPC action intervals for more realistic pacing - lumberjacks now chop every 4.5 seconds, miners every 3.8 seconds
- **Complete Day/Night Cycle Integration**: Implemented game time system with 5-minute day cycles and NPC work schedules (6 AM - 6 PM work hours)
- **Game Time Display**: Added comprehensive time display in taskbar showing current game time, day count, and time period (dawn, morning, noon, afternoon, dusk, night, midnight)
- **Simplified Background**: Removed sky gradient effects for cleaner visual appearance per user preference
- **Complete NPCStore System Audit (Aug 16)**: ✅ CONCLUÍDA - Successfully resolved all 23 TypeScript errors in NPCStore including inventory type inconsistencies, circular dependency issues between stores, resource management system unification, and proper type safety for NPC tasks and animations. System now operates with unified ResourceInventory interface (wood, stone, food) and proper item-to-resource mapping. All NPCs working correctly with autonomous resource collection and storage.
- **NPC Visual Simplification (Aug 16)**: ✅ CONCLUÍDA - Removed all NPC sprites and implemented simple circle-based rendering with cute eyes. NPCs now display as colored circles (brown for lumberjacks, gray for miners, red for farmers) with white eyes and black pupils. Eliminated sprite loading errors while maintaining all animations and tool emojis for work activities.
- **Memory Leak Prevention (Aug 16)**: ✅ CONCLUÍDA - Added proper cleanup for NPCManager singleton to prevent memory leaks. Implemented cleanup call in GameWorld2D component unmount to clear setInterval and all NPC data structures when game component is destroyed.
- **Rendering Performance Optimization (Aug 16)**: ✅ CONCLUÍDA - Enhanced rendering loop with improved culling for NPCs, conditional weather system updates, and optimized visibility checks. Applied frustum culling to all game objects including NPCs for better performance in large worlds.
- **Complete Farming System Implementation (Aug 16)**: ✅ CONCLUÍDA - Implemented full farming mechanics where farmers automatically produce bread every 8 seconds with proper inventory management, cooldown systems, and farming animations. Replaced all TODO placeholders with working game logic.
- **Enhanced Mining System (Aug 16)**: ✅ CONCLUÍDA - Completed mining system implementation with manual mining actions, cooldown management, and proper stone collection mechanics. Miners can now break adjacent stones with visual feedback and resource gathering.
- **Tree Cutting System Completion (Aug 16)**: ✅ CONCLUÍDA - Finalized lumberjack tree cutting mechanics with proper TreeStore integration, damage calculation, and resource collection. Eliminated all placeholder implementations in NPCActionSystem.
- **Complete System Integration Audit (Aug 16)**: ✅ CONCLUÍDA - Systematically reviewed and completed all TODO items and placeholder implementations across the game systems. All profession systems (farmer, miner, lumberjack) now have complete functionality with proper store integration and resource management.

# User Preferences

Preferred communication style: Simple, everyday language.
UI preferences: Clean interface without window borders or decorative frames.

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
  - `useNPCStore`: NPC behavior, movement, AI, and manual action system
  - `useAudio`: Sound effects and background music
  - `useGame`: Game phases (ready, playing, ended)
- **Grid-based positioning system** with world-to-grid coordinate conversion
- **Real-time movement system** using canvas-based 2D rendering
- **Manual Action System**: Custom event-driven architecture for processing player-initiated NPC actions with real-time feedback and progress tracking

## 2D Rendering Architecture
- **Canvas-based isometric rendering** with optimized drawing loops and sprite management
- **Custom camera system** with smooth following for controlled NPCs and manual panning/zooming
- **Grid-based world** with visual grid lines and cell-based positioning
- **Sprite system** for houses with fallback geometric rendering
- **Animation system** for NPC movement, work actions (chopping), and visual effects
- **Mobile-responsive** controls with virtual joystick and touch support
- **Real-time effect system** for visual feedback (text effects, animations)

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

## PlayStation 5 Integration
- **DualSense Controller Support**: Full gamepad API integration with button mapping and analog stick controls
- **Haptic Feedback System**: Vibration patterns for different game actions (building, chopping, UI interactions)
- **Adaptive Trigger Simulation**: Resistance feedback for work activities and tool usage
- **PS5 Browser Detection**: Automatic detection and optimization for PlayStation 5 browser environment
- **Controller-to-Keyboard Mapping**: Seamless integration with existing keyboard controls via event dispatching
- **Virtual Cursor Navigation**: Right stick controls for precise navigation in PS5 browser
- **Performance Monitoring**: Real-time FPS and memory usage tracking optimized for PS5 hardware