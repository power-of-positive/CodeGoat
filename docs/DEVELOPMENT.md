# Development Guide

## Quick Start

### Running Development Servers

We provide several convenient scripts to manage development servers:

#### Start All Servers
```bash
npm run dev:all
```
This starts both the backend (port 3000) and UI (port 5173) servers with automatic restart on file changes.

#### Check Server Status
```bash
npm run dev:status
```
Shows which servers are currently running and their process IDs.

#### Kill All Servers
```bash
npm run dev:kill
```
Stops all development servers.

### Individual Server Management

#### Backend Server Only
```bash
npm run dev
```
Starts the backend server with nodemon on port 3000.

#### UI Server Only
From the `ui` directory:
```bash
npm run dev:watch
```
Or use the dedicated script:
```bash
./scripts/dev-ui.sh
```

## Features

### Automatic Process Management
- **Nodemon Integration**: Both servers use nodemon for automatic restart on file changes
- **Port Cleanup**: Scripts automatically kill existing processes on ports 3000 and 5173 before starting
- **Graceful Shutdown**: Press Ctrl+C to cleanly stop all servers

### Enhanced Logging
- **Timestamped Logs**: All log entries include timestamps for better debugging
- **Color-Coded Output**: Different colors for info, success, warning, and error messages
- **Verbose Mode**: Detailed logging of file changes and restart events

### Process Visibility
The dev scripts provide:
- Clear indication of which servers are running
- Process IDs for manual management if needed
- Combined log output from both servers
- Easy-to-read status information

## Troubleshooting

### Port Already in Use
The scripts automatically handle this, but if you encounter issues:
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :5173

# Kill processes manually
kill -9 <PID>
```

### Scripts Not Executable
If you get a permission error:
```bash
chmod +x scripts/*.sh
chmod +x ui/scripts/*.sh
```

### Nodemon Not Found
The scripts will attempt to install nodemon if it's missing, but you can manually install:
```bash
npm install -g nodemon
```

## Development Workflow

1. **Start Development**: Run `npm run dev:all` from the project root
2. **Make Changes**: Edit files - servers will restart automatically
3. **Check Status**: Run `npm run dev:status` to see running servers
4. **Stop Development**: Press Ctrl+C or run `npm run dev:kill`

## Environment Variables

The development scripts respect the following environment variables:
- `NODE_ENV`: Set to 'development' by default
- `PORT`: Backend server port (default: 3000)
- `VITE_PORT`: UI server port (default: 5173)