    ☐ Fix ESLint errors blocking commit - remove
      unused handleConfigError import and fix any
      types in security.ts
    ☐ Update LLM reviewer to block on medium
      priority comments
    ☐ Record pre-commit failure stages and metrics
      - track lint fail, test fail, LLM reviewer
      fail as % of commit attempts, number of files
       in attempt, and other dev flow metrics
    ☐ Remove legacy config functionality and
      related tests - clean up legacy model_list
      format support and associated test code
    ☐ Add a page to visualise pre-commit failures
      - create UI to display failure analytics,
      success rates, and trends for development
      workflow insights
    ☐ Decouple pre-commit checks into validation
      script - extract validation logic (lint,
      test, LLM reviewer) into separate script
      that pre-commit calls, with tracking and
      measuring built into validators
    ☐ Design extensible validation framework -
      enable users to insert custom validation
      scripts that execute sequentially, with
      failure tracking and analysis for each stage
