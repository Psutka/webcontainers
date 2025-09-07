# Container Management Service

A monorepo containing three services for dynamic container management and web app development.

## Architecture

This project consists of three main services:

1. **ClientApp** - Next.js web application with three main windows
2. **ContainerGw** - NestJS API gateway for container management  
3. **AppContainer** - Node.js service running inside Docker containers

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Docker
- Docker Compose (optional)

### Installation

```bash
# Install dependencies for all packages
pnpm install

# Build all packages
pnpm build
```

### Development

Start all services in development mode:

```bash
# Start all services in parallel
pnpm dev

# Or start individual services
pnpm start:client    # Start ClientApp (Next.js)
pnpm start:gateway   # Start ContainerGw (NestJS)
pnpm start:container # Start AppContainer (Node.js)
```

### Production

```bash
# Build all packages
pnpm build

# Start in production mode
pnpm start
```

## Services

### ClientApp (port 3000)

Single-page Next.js application with:
- **Message Window**: Displays system messages and notifications
- **Terminal Window**: Interactive terminal connected to container shell
- **Preview Window**: Embedded browser for viewing containerized web apps

**Tech Stack:**
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Socket.IO Client
- Turbopack for development

### ContainerGw (port 3001)

NestJS API gateway that manages Docker containers:
- Create/terminate containers
- WebSocket communication
- Container status monitoring

**API Endpoints:**
- `POST /api/containers` - Create new container
- `DELETE /api/containers/:id` - Terminate container
- `GET /api/containers/:id` - Get container status
- `GET /api/containers` - List all containers

**WebSocket Events:**
- Terminal I/O forwarding
- File transfers
- Zip file uploads

**Tech Stack:**
- NestJS
- TypeScript
- Socket.IO
- Dockerode
- ESLint

### AppContainer

Node.js service running inside Docker containers:
- File system operations
- Terminal command execution
- Web app hosting on port 3000
- Zip file extraction

**Features:**
- Interactive shell access
- File upload/download
- Static web app serving
- npm/build script execution

## Development Workflow

1. **Create Container**: ClientApp calls ContainerGw API
2. **WebSocket Connection**: Direct communication between ClientApp and AppContainer
3. **File Transfer**: Upload source code via zip files
4. **Terminal Access**: Execute commands in container shell
5. **Web App Preview**: View running applications in embedded browser

## Scripts

```bash
# Development
pnpm dev              # Start all services in development
pnpm start:client     # Start only ClientApp
pnpm start:gateway    # Start only ContainerGw  
pnpm start:container  # Start only AppContainer

# Building
pnpm build           # Build all packages
pnpm clean           # Clean all build outputs

# Linting
pnpm lint            # Lint all packages
```

## Environment Variables

### ContainerGw
- `PORT` - Server port (default: 3001)

### AppContainer
- `GATEWAY_URL` - Container Gateway URL (default: http://localhost:3001)
- `CONTAINER_ID` - Unique container identifier

### ClientApp
- `NEXT_PUBLIC_CONTAINER_GW_URL` - Container Gateway URL for API calls

## Docker Integration

The ContainerGw service uses Docker to:
- Create containers from `node:alpine` image
- Install npm and development tools
- Set up port forwarding (3000 for web apps)
- Manage container lifecycle

## Security Notes

- Containers run in isolated environments
- File operations are sandboxed to container filesystem
- WebSocket connections are authenticated by container ID
- CORS is configured for development (modify for production)

## Contributing

1. Install dependencies: `pnpm install`
2. Start development servers: `pnpm dev`
3. Make changes to packages in `packages/` directory
4. Run linting: `pnpm lint`
5. Build and test: `pnpm build`