    ☐ Replace id attributes with data-testid for
      testing - don't use id unless absolutely
      necessary
    ☐ Convert the app to dark mode
    ☐ Change config YAML format back to object
      format (litellm-style) instead of indented
      format
    ☐ Add code duplication check to pre-commit
      hook that blocks on duplicates
    ☐ Integrate OpenAI-based LLM code reviewer for
      pre-commit that returns JSON comments and
      blocks commit on high severity issues
    ☐ Auto clean server logs and store all logs in
      a logs folder
    ☐ Replace custom logger with winston logger
      library
    ☐ Make server frontend run in nodemon with
      visible logs and easy kill capability
    ☐ Split management routes granularly: models,
      openrouter-stats, status into separate files
    ☐ Split AddModelDialog into smaller components
    ☐ Review hookform usage and necessity
    ☐ Add max-lines 200 ESLint rule per TS file
      (excluding test files)
    ☐ Add max 40 lines per function ESLint rule
      (excluding TSX files)
