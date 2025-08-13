# Development Commands

## Development Workflow

```bash
# Start development server (full stack)
npm run dev

# Install dependencies
npm install

# Frontend development
cd frontend
npm run dev          # Frontend dev server
npm run build        # Production build
npm run preview      # Preview build

# Backend development
cd backend
cargo run            # Run backend server
cargo build          # Build backend
cargo test           # Run tests
```

## Code Quality & Testing

```bash
# Frontend linting and formatting
cd frontend
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run format       # Format with Prettier
npm run format:check # Check formatting
npm run format:fix   # Format + fix linting

# Frontend testing
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once

# Playwright E2E testing
npm run test:playwright         # Run Playwright tests
npm run test:playwright:ui      # Run with UI mode
npm run test:playwright:headed  # Run in headed mode

# Backend linting and formatting
cd backend
cargo fmt            # Format code
cargo fmt --check    # Check formatting
cargo clippy         # Run linter
cargo clippy --all-targets -- -D warnings  # Strict linting

# Pre-commit checks (run all quality checks)
npm run precommit
```

## Git Workflow

```bash
# The project uses git hooks for quality assurance
# Pre-commit hook runs automatically on commit and includes:
# - Frontend linting and formatting checks
# - Frontend unit tests
# - Playwright E2E tests
# - Rust formatting and clippy checks

# To run pre-commit checks manually:
npm run precommit

# The claude-stop-hook.ts provides detailed error messages
# to help AI assistants automatically fix issues
```
