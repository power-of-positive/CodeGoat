# Quality Assurance Setup

## 🎯 Overview

This project now includes a comprehensive quality assurance system with linting, formatting, testing, and pre-commit hooks to ensure code quality and prevent regressions.

## 🛠️ Tools & Configuration

### **ESLint + TypeScript**
- **Config**: `eslint.config.js` with TypeScript-specific rules
- **Rules**: Strict TypeScript linting with Prettier integration
- **Commands**: 
  - `npm run lint` - Check for linting errors
  - `npm run lint:fix` - Auto-fix linting errors

### **Prettier**
- **Config**: `.prettierrc` with consistent formatting rules
- **Integration**: Works seamlessly with ESLint
- **Commands**:
  - `npm run format` - Format all TypeScript files
  - `npm run format:check` - Check formatting without changes

### **Jest Testing**
- **Config**: `jest.config.js` with TypeScript support
- **Coverage**: 50% threshold with detailed reporting
- **Types**: Unit tests, integration tests, and e2e tests
- **Commands**:
  - `npm run test` - Run all tests
  - `npm run test:watch` - Run tests in watch mode
  - `npm run test:coverage` - Run tests with coverage report
  - `npm run test:e2e` - Run e2e tests only

### **Husky + lint-staged**
- **Pre-commit hooks**: Automatically run quality checks before commits
- **Staged files only**: Only processes files being committed
- **Pipeline**:
  1. ESLint auto-fix on staged files
  2. Prettier formatting on staged files
  3. TypeScript type checking
  4. Run all tests to ensure nothing breaks

## 📊 Test Coverage

Current test suites:

### **Unit Tests** (`src/__tests__/`)
- **ConfigLoader** - Configuration loading and validation
- **RouteMatcher** - Path matching and route resolution
- **ConfigurableProxyHandler** - Proxy request handling

### **E2E Tests** (`tests/e2e.test.ts`)
- Health check endpoint
- Models listing endpoint
- Chat completions (multiple providers)
- Error handling
- Streaming responses

### **Coverage Metrics**
- **Statements**: 50%+ (currently ~50%)
- **Branches**: 50%+ (currently ~45%)
- **Functions**: 50%+ (currently ~51%)
- **Lines**: 50%+ (currently ~50%)

## 🚀 Commands

### **Quality Pipeline**
```bash
# Run complete quality pipeline
npm run quality

# Individual quality checks
npm run lint          # ESLint checking
npm run format:check  # Prettier formatting check
npm run type-check    # TypeScript compilation
npm run test          # Jest test suite
```

### **Development Workflow**
```bash
# Development mode with auto-restart
npm run dev

# Build for production
npm run build

# Run production server
npm run start
```

### **Testing Workflow**
```bash
# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run only e2e tests
npm run test:e2e
```

## 🔧 Pre-commit Hook

The pre-commit hook (`.husky/pre-commit`) automatically runs:

1. **lint-staged** - Lint and format only staged files
2. **TypeScript compilation** - Ensure no type errors
3. **Test suite** - Ensure all tests pass

**Benefits**:
- Prevents broken code from being committed
- Maintains consistent code style
- Catches issues early in development
- Ensures all tests pass before commits

## 📁 File Structure

```
├── src/
│   ├── __tests__/           # Unit tests
│   │   ├── config.test.ts
│   │   ├── matcher.test.ts
│   │   └── proxy-handler.test.ts
│   └── ... (source files)
├── tests/
│   ├── setup.ts             # Jest global setup
│   └── e2e.test.ts         # End-to-end tests
├── coverage/                # Test coverage reports
├── .husky/
│   └── pre-commit          # Git pre-commit hook
├── eslint.config.js        # ESLint configuration
├── .prettierrc             # Prettier configuration
├── .prettierignore         # Prettier ignore rules
├── jest.config.js          # Jest test configuration
└── tsconfig.json           # TypeScript configuration
```

## 🔍 Quality Standards

### **Code Style**
- **Single quotes** for strings
- **Semicolons** required
- **2 spaces** for indentation
- **100 character** line length
- **Trailing commas** in ES5 contexts

### **TypeScript Rules**
- **Strict mode** enabled
- **No unused variables** (except with `_` prefix)
- **Explicit return types** encouraged but not required
- **No explicit `any`** warnings (errors in some contexts)

### **Test Requirements**
- **All new features** must have unit tests
- **Critical paths** must have integration tests
- **API endpoints** must have e2e tests
- **Minimum 50% coverage** on all metrics

## ✅ Benefits

1. **Consistent Code Quality** - ESLint and Prettier ensure uniform style
2. **Type Safety** - TypeScript prevents runtime type errors  
3. **Test Coverage** - Jest ensures functionality works as expected
4. **Pre-commit Safety** - Husky prevents broken commits
5. **Developer Experience** - Auto-fixing reduces manual work
6. **CI/CD Ready** - All tools configured for automation

The quality assurance system is now fully integrated and will help maintain high code standards as the project grows.