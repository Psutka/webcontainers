# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Container Management Service** monorepo that enables dynamic Docker container creation and management through a web interface. The system allows users to create isolated development environments, upload code, execute terminal commands, and preview web applications running inside Docker containers.

## Architecture

The system consists of three interconnected services in a pnpm workspace:

### 1. ClientApp (Next.js - Port 3000)
**Path**: `packages/client-app/`
- **Framework**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Purpose**: Single-page web application with three main windows
- **Key Components**:
  - `MessageWindow` - System notifications and status messages  
  - `TerminalWindow` - Interactive shell connected to container via WebSocket
  - `PreviewWindow` - Embedded iframe for viewing containerized web apps
  - `ConnectionProgress` - Real-time progress tracking for container lifecycle

### 2. ContainerGw (NestJS - Port 9001 by default)
**Path**: `packages/container-gw/`
- **Framework**: NestJS with TypeScript, Socket.IO, Dockerode
- **Purpose**: API gateway managing Docker containers and WebSocket connections
- **Key Files**:
  - `src/containers/containers.service.ts` - Docker container lifecycle management
  - `src/websockets/container.gateway.ts` - WebSocket event handling with state tracking
  - `src/scripts/setup-container.js` - AppContainer service code injected into containers
- **Critical Feature**: Maintains container state to handle client reconnections

### 3. AppContainer (Node.js - Runs inside Docker containers)
**Path**: `packages/app-container/`
- **Framework**: Node.js with TypeScript, Socket.IO Client
- **Purpose**: Service running inside Docker containers for file operations and terminal access
- **Key Services**:
  - `TerminalService` - Shell command execution and I/O streaming
  - `FileService` - File upload/download and zip extraction
  - `WebAppService` - Static web server for previewing applications

## Development Commands

### Start All Services
```bash
pnpm dev                    # Start all services in parallel development mode
PORT=9001 pnpm dev         # Start with specific gateway port
```

### Individual Service Commands
```bash
# ClientApp (Next.js)
pnpm --filter client-app dev        # Development with Turbo
pnpm --filter client-app build      # Production build
pnpm --filter client-app lint       # Lint with Next.js ESLint

# ContainerGw (NestJS) 
PORT=9001 pnpm --filter container-gw dev     # Development with watch mode
pnpm --filter container-gw build             # Nest.js build
pnpm --filter container-gw test              # Jest tests
pnpm --filter container-gw lint              # ESLint with Prettier

# AppContainer (Node.js)
pnpm --filter app-container dev      # Development with nodemon
pnpm --filter app-container build    # TypeScript compilation
```

### Testing Commands
```bash
# Container Gateway (NestJS) Tests
pnpm --filter container-gw test              # Unit tests
pnpm --filter container-gw test:watch        # Watch mode
pnpm --filter container-gw test:e2e          # End-to-end tests
pnpm --filter container-gw test:cov          # Coverage report
pnpm --filter container-gw test:debug        # Debug tests with inspect

# Linting and Formatting
pnpm --filter container-gw lint              # ESLint with auto-fix
pnpm --filter container-gw format            # Prettier formatting
pnpm --filter client-app lint                # Next.js ESLint
pnpm --filter app-container lint             # ESLint for AppContainer
```

## Critical Architecture Patterns

### WebSocket State Management
The `ContainerGateway` maintains a `containerStates` Map to track:
- `appContainerConnected` - Whether AppContainer service is running
- `terminalReady` - Whether terminal shell is initialized

This prevents race conditions when clients reconnect by replaying missed events.

### Container Lifecycle Flow
1. **ClientApp** calls `POST /api/containers` → **ContainerGw**
2. **ContainerGw** creates Docker container with `node:alpine` base image
3. **ContainerGw** injects and starts AppContainer service via `setup-container.js`
4. **AppContainer** connects back to **ContainerGw** WebSocket with fallback URLs
5. **ClientApp** receives container info and connects to WebSocket
6. Real-time communication established for terminal I/O and file operations

### Docker Integration Details
- **Base Image**: `node:alpine` with npm installation and latest npm version
- **Network Access**: Uses `host.docker.internal` for container-to-host communication
- **Port Mapping**: Exposes container port 3000 for web app previews (auto-assigned host port)
- **File System**: Containers use `/app` as working directory
- **Environment Variables**: `CONTAINER_ID`, `GATEWAY_URL`, `NODE_ENV`
- **AppContainer Injection**: `setup-container.js` script dynamically injects AppContainer service code
- **Service Installation**: Auto-installs `socket.io-client` and creates `package.json` in container

### WebSocket Event System
**Client → Gateway → Container Events**:
- `join-container` - Client joins container room
- `terminal-input` - Execute shell commands
- `send-file` - Upload individual files  
- `send-zip` - Upload and extract zip archives

**Container → Gateway → Client Events**:
- `app-container-ready` - AppContainer service started
- `terminal-ready` - Shell initialized and ready
- `terminal-output` - Command output (stdout/stderr)

## Environment Configuration

### Required Environment Variables
- **ContainerGw**: `PORT` (default: 9001) - Gateway server port
- **ClientApp**: `NEXT_PUBLIC_CONTAINER_GW_URL` - Gateway URL for API calls
- **AppContainer**: Set automatically by ContainerGw during container creation:
  - `CONTAINER_ID` - Unique container identifier (UUID)
  - `GATEWAY_URL` - WebSocket connection URL with host.docker.internal
  - `NODE_ENV` - Set to 'development'

### Port Configuration Notes
- Use `PORT=9001` to avoid common port conflicts (3001, 8080, 9000 often in use)
- ContainerGw auto-assigns dynamic ports for container web apps
- ClientApp runs on standard Next.js port 3000

## Common Development Scenarios

### Debugging WebSocket Issues
1. Check ContainerGw logs for connection attempts and state tracking
2. Verify AppContainer service is running inside container: `docker exec <container> ps aux | grep app-container`
3. Monitor WebSocket events in browser DevTools → Network → WS tab
4. Check container networking: AppContainer tries multiple URLs for gateway connection

### Adding New WebSocket Events
1. Add event handler in `ContainerGateway` (`@SubscribeMessage`)
2. Update client-side WebSocket hook in `useWebSocket.ts`
3. Consider state tracking needs for client reconnection scenarios

### Container Management
- Containers automatically pull `node:alpine` image if not present
- AppContainer service code is dynamically injected via `setup-container.js`, not built into image
- Service logs available at `/app/app-container.log` inside container
- Use Docker commands to inspect running containers and debug issues:
  - `docker exec <container> ps aux | grep app-container` - Check if service is running
  - `docker exec <container> cat /app/app-container.log` - View service logs
- Container state is tracked in memory - does not persist across gateway restarts

## Important Implementation Notes

### Timing and Race Conditions
- **Container Initialization**: 2-second delay before ClientApp connects to allow container setup
- **WebSocket Dependencies**: useEffect dependency arrays are critical - avoid including state that triggers reconnections
- **AppContainer Startup**: Multiple fallback URLs ensure connection even if `host.docker.internal` fails

### Security Considerations
- Containers run in isolated Docker environments
- File operations are sandboxed to container filesystem
- CORS configured for development (requires production hardening)
- No authentication beyond container ID verification

### Monorepo Workspace Management
- Use `pnpm --filter <package>` for package-specific operations
- Shared TypeScript configuration and ESLint rules across packages
- Build outputs in individual `dist/` directories per package
- Clean builds with `pnpm clean` removes all build artifacts