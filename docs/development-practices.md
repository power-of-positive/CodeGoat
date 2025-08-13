# Development Best Practices

## Code Style

**Frontend (TypeScript/React):**

- Use TypeScript for all new files
- Follow React hooks best practices
- Use Tailwind CSS for styling
- Prefer functional components with hooks
- Use proper error boundaries
- Follow ESLint rules (max 100 warnings allowed)

**Backend (Rust):**

- Use `cargo fmt` for formatting
- Address all clippy warnings
- Use proper error handling with `anyhow`
- Follow Rust naming conventions
- Use async/await for I/O operations

## Testing & Test-Driven Development (TDD)

**TDD Workflow - MANDATORY for all new features:**

1. **Write the test first** - Before implementing any new functionality
2. **Run the test and verify it fails** - Confirm the test is valid
3. **Write minimal code to make the test pass** - No more, no less
4. **Refactor if necessary** - While keeping tests green
5. **Repeat** - For each new piece of functionality

**Frontend Testing:**

- Use Vitest for unit tests
- Test files: `*.test.ts` or `*.test.tsx`
- Use React Testing Library for component tests
- Place tests in the same directory as components
- Always run `npm run test:run` to verify tests pass

**Backend Testing:**

- Use Rust's built-in testing framework
- Integration tests in `tests/` directory
- Unit tests in same files as code using `#[cfg(test)]`
- Run `cargo test` to verify all tests pass

**TDD Example Workflow:**

```bash
# 1. Write failing test
npm run test:run  # Should fail for new functionality

# 2. Implement minimal code to pass test
npm run test:run  # Should now pass

# 3. Refactor if needed
npm run test:run  # Should still pass

# 4. Repeat for next feature
```

## Database

- SQLite database with SQLx migrations
- Migration files in `backend/migrations/`
- Use proper SQL migrations for schema changes
- Test migrations both up and down