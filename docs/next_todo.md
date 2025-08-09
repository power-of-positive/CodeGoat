    ☐ Remove all ESLint disable comments and
      fix underlying issues by refactoring
      large functions/files into smaller
      modules
    ☐ Enhance request details UI with
      collapsible request/response body and
      headers display instead of modal
    ☐ Add a page to visualise validation
      failures - create UI to display failure
      analytics, success rates, and trends for
      development workflow insights
      (configurable validation stages)
    ☐ Disallow ESLint disabling throughout the
      codebase - prevent use of eslint-disable
      comments to enforce consistent code
      quality standards
    ☐ Move default settings from TypeScript
      constants to dedicated JSON configuration
      files - extract default settings into JSON
       files for easier configuration management

    ☐ Add validation metrics tab to display
      development workflow analytics and stage
      success rates
    ☐ Centralize base URLs and constants -
      remove duplication from component files
      like ModelList.tsx
    ☐ Implement type sharing between UI and
      backend via generated OpenAPI schema
      validation
    ☐ Remove legacy config functionality and
      related tests - clean up legacy
      model_list format support and associated
      test code
    ☐ Create agent runner that executes tasks
      with validation loops - runs agent with
      task, validates with user script, feeds
      back failures until validation passes or
      max attempts reached
    ☐ Fix failing unit tests for logs and
      settings routes - align test expectations
      with actual route implementations
    ☐ Deduplicate and centralize mock files in
      AI code reviewer tests - consolidate test
      mocks into reusable test helpers to reduce
       code duplication
