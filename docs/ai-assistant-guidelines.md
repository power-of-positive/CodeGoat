# AI Assistant Guidelines

## When Working on This Project:

1. **Follow clean code practices** from Uncle Bob
2. **Test before implementation** - Always write tests first
3. **Use TypeScript** for all new code
4. **Use Jest/Vitest** for testing (Vitest for this project)
5. **Use Playwright** for E2E testing of UI components
6. **Use ESLint** for linting
7. **Use Prettier** for formatting
8. **Use Git** for version control (but don't execute git commands unless asked)
9. **Follow SOLID principles**
10. **Keep files under 150 lines long**
11. **UI changes MUST include Playwright E2E tests**
12. **First clarify requirements, then implement test, then implement functionality, then run tests and if tests fail try again**

## Project Management:

13. **Test early, test often** - Every new function should have unit tests
14. **Be specific in requests** - The more context, the better. Examples help a lot
15. **Write docs and comments** as you go. Don't delay documentation
16. **DO NOT implement environment variables yourself** - Ask user to do it
17. **After writing code, perform detailed code review** - Come up with suggestions and implement them
18. **When implementing a feature, write the tests first**
19. **UI component changes require corresponding Playwright tests**

## TDD Requirements for AI Assistants:

**For ANY new feature or functionality:**

1. **Clarify requirements** - Understand what needs to be built
2. **Write a failing test** that describes the expected behavior
3. **Run the test** to confirm it fails (and explain why it should fail)
4. **Write minimal code** needed to make the test pass
5. **Run the test again** to confirm it passes
6. **Refactor code** if needed while keeping tests green
7. **Perform code review** and implement suggestions

**Never skip the TDD cycle** - this ensures code quality and prevents regressions.

## Code Quality Standards:

- **Frontend**: ESLint warnings must be under 100
- **Backend**: All clippy warnings must be addressed
- **Tests**: All unit tests must pass
- **E2E Tests**: All Playwright tests must pass
- **Formatting**: Code must be properly formatted
- **UI Testing**: UI components must have Playwright test coverage

## Debugging Tips:

- Use the integrated development server: `npm run dev`
- Check browser console for frontend errors
- Check backend logs for API issues
- Use the built-in file system browser for file operations
- Monitor task execution through the UI
