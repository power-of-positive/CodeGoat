# AI Code Reviewer Documentation

## Overview

The AI Code Reviewer is an automated tool that uses AI to review staged code changes before commits. It can identify security vulnerabilities, performance issues, code quality problems, and best practice violations.

## Blocking Behavior

By default, the AI Code Reviewer **blocks commits on medium severity issues and above**. This ensures that potentially problematic code doesn't make it into the repository.

### Severity Levels

Issues are categorized into five severity levels:

1. **🔴 Critical** - Severe security vulnerabilities, data loss risks, or system-breaking bugs
2. **🟠 High** - Major security issues, significant performance problems, or serious bugs
3. **🟡 Medium** - Moderate issues like potential XSS, SQL injection risks, or code that could cause problems
4. **🔵 Low** - Minor issues, style problems, or small improvements
5. **⚪ Info** - Informational suggestions, best practices, or documentation improvements

### Default Blocking Threshold: Medium

The reviewer blocks commits when it finds issues at **medium severity or higher**. This means:

- ✅ **Allowed**: Info and Low severity issues
- ❌ **Blocked**: Medium, High, and Critical severity issues

## Configuration

### Environment Variables

- `AI_REVIEWER_MAX_SEVERITY` - Sets the minimum severity that will block commits
  - Options: `critical`, `high`, `medium`, `low`, `info`
  - Default: `medium`
  - Example: `AI_REVIEWER_MAX_SEVERITY=high` (only blocks on high/critical)

- `AI_REVIEWER_ENABLED` - Enable/disable the reviewer
  - Default: `true`
  - Set to `false` to disable

- `AI_REVIEWER_MODEL` - AI model to use for reviews
  - Default: `openrouter/anthropic/claude-3.5-sonnet`

- `AI_REVIEWER_ENDPOINT` - API endpoint
  - Default: `https://openrouter.ai/api/v1`

- `OPENAI_API_KEY` or `OPENROUTER_API_KEY` - API key for the AI service

## Usage

### Running Manually

```bash
npm run ai-review
```

### Git Hook Integration

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run ai-review
```

### Example Output

When blocking issues are found:

```
🤖 AI Code Review Results
========================================
Files reviewed: 2
Total issues: 3

Issues by severity:
  🟡 medium: 1
  🔵 low: 1
  ⚪ info: 1

📋 Notable Issues:

  src/api/auth.ts:45
  MEDIUM: Potential SQL injection vulnerability
  💡 Use parameterized queries instead of string concatenation

📊 Detailed results saved to: ai-review-results.json

🚫 Found 1 blocking issue(s) at medium severity or higher

❌ Commit blocked due to severity issues!
   Found 1 issue(s) at medium severity or higher
   Blocking threshold: medium (configure with AI_REVIEWER_MAX_SEVERITY)

   Blocking issues by severity:
     🟡 medium: 1 issue(s)
```

When no blocking issues are found:

```
🤖 AI Code Review Results
========================================
Files reviewed: 2
Total issues: 2

Issues by severity:
  🔵 low: 1
  ⚪ info: 1

📊 Detailed results saved to: ai-review-results.json

✅ No blocking issues found. Commit can proceed.
   Current blocking threshold: medium
```

## Common Issue Types

### Security Issues (Usually Medium to Critical)
- SQL injection vulnerabilities
- XSS (Cross-Site Scripting) risks
- Hardcoded credentials or API keys
- Insecure random number generation
- Path traversal vulnerabilities

### Performance Issues (Usually Low to High)
- N+1 query problems
- Inefficient algorithms
- Memory leaks
- Unnecessary re-renders (React)

### Code Quality (Usually Info to Medium)
- Missing error handling
- Inconsistent naming conventions
- Dead code
- Complex functions that should be refactored
- Missing TypeScript types

## Adjusting Sensitivity

### For Stricter Reviews
Set to block on low severity:
```bash
export AI_REVIEWER_MAX_SEVERITY=low
```

### For More Lenient Reviews
Set to block only on high severity:
```bash
export AI_REVIEWER_MAX_SEVERITY=high
```

### For Emergency Commits
Temporarily disable:
```bash
export AI_REVIEWER_ENABLED=false
```

## Integration with CI/CD

The reviewer exits with code 1 when blocking issues are found, making it easy to integrate into CI/CD pipelines:

```yaml
# GitHub Actions example
- name: AI Code Review
  env:
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
    AI_REVIEWER_MAX_SEVERITY: medium
  run: npm run ai-review
```

## Best Practices

1. **Don't ignore medium severity issues** - They often represent real security or stability risks
2. **Review the detailed output** - The AI provides helpful suggestions for fixing issues
3. **Adjust thresholds per project** - Critical projects might use `low`, while prototypes might use `high`
4. **Use in combination with other tools** - AI review complements but doesn't replace traditional linting and testing

## Troubleshooting

### Review takes too long
The AI needs to analyze each file. For large changesets, consider:
- Breaking changes into smaller commits
- Reviewing files in parallel (future enhancement)

### False positives
If the AI frequently flags non-issues:
- Check if the model understands your project's context
- Consider adjusting the threshold temporarily
- Report consistent false positives for model improvement

### API errors
- Ensure your API key is set correctly
- Check API endpoint is accessible
- Verify you have sufficient API credits