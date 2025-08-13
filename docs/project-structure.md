# Project Structure & Architecture

## Project Overview

Vibe Kanban is a task management system designed to work with AI coding agents like Claude Code, Gemini CLI, and others. It helps developers orchestrate multiple coding agents, track task progress, and manage development workflows.

**Architecture:**

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Rust + Axum + SQLx + SQLite
- **Database**: SQLite with migrations
- **Build System**: npm workspace with Rust backend

## Project Structure

```
vibe-kanban/
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities and API
│   │   └── hooks/         # Custom React hooks
│   ├── package.json       # Frontend dependencies
│   └── vite.config.ts     # Vite configuration
├── backend/               # Rust backend
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── models/        # Database models
│   │   ├── services/      # Business logic
│   │   └── executors/     # AI agent integrations
│   ├── migrations/        # Database migrations
│   └── Cargo.toml         # Backend dependencies
├── scripts/               # Build and development scripts
└── shared/                # Shared TypeScript types
```

## Key Features & Components

### Task Management

- Tasks can be assigned to different AI executors
- Task attempts track execution history
- Git integration for branch management
- PR tracking and monitoring

### AI Executor Integration

- Support for Claude Code, Gemini CLI, and other agents
- Configurable executor settings
- Real-time execution monitoring
- Process management and logging

### Development Tools

- Built-in file system browser
- Git worktree management
- Real-time process monitoring
- Configuration management