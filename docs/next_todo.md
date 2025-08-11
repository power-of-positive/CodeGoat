[x] Add a page to visualise validation failures -
      create UI to display failure analytics, success
      rates, and trends for development workflow
      insights (configurable validation stages)
    [x] Disallow ESLint disabling throughout the
      codebase - prevent use of eslint-disable
      comments to enforce consistent code quality
      standards
    [x] Move default settings from TypeScript constants
      to dedicated JSON configuration files - extract
      default settings into JSON files for easier
      configuration management
    [x] Add validation metrics tab to display
      development workflow analytics and stage
      success rates
    [x] Centralize base URLs and constants - remove
      duplication from component files like
      ModelList.tsx
    ☐ Implement type sharing between UI and backend
      via generated OpenAPI schema validation
    [x] Create analytics viewing page - display
      development workflow metrics, validation
      success rates, and performance analytics
    [x] Split proxy-handler into smaller, more focused
      files for better maintainability
    ☐ Remove legacy config functionality and related
      tests - clean up legacy model_list format
      support and associated test code
    [x] Create agent runner that executes tasks with
      validation loops - runs agent with task,
      validates with user script, feeds back failures
      until validation passes or max attempts reached
    ☐ Fix failing unit tests for logs and settings
      routes - align test expectations with actual
      route implementations
    ☐ Deduplicate and centralize mock files in AI
      code reviewer tests - consolidate test mocks
      into reusable test helpers to reduce code
      duplication
