# AI Code Reviewer Setup Guide

## Overview

The AI Code Reviewer is an automated tool that analyzes your code changes during the commit process and provides intelligent feedback on:

- Security vulnerabilities
- Performance issues  
- Code quality and maintainability
- Best practices
- Potential bugs
- TypeScript/JavaScript specific issues

## Current Status

✅ **FIXED**: The LLM reviewer is now working correctly
- No longer blocks commits when API key is missing
- Provides clear feedback on configuration requirements
- Gracefully handles authentication failures

## Quick Setup

### 1. Get an API Key

Choose one of these options:

**Option A: OpenRouter (Recommended)**
1. Visit [https://openrouter.ai/](https://openrouter.ai/)
2. Sign up for an account
3. Generate an API key
4. Add credits to your account (usually $5-10 is sufficient for development)

**Option B: OpenAI Direct**
1. Visit [https://platform.openai.com/](https://platform.openai.com/)
2. Sign up for an account  
3. Generate an API key
4. Add payment method

### 2. Configure Environment Variables

Create or update your `.env` file:

```bash
# For OpenRouter (Recommended)
OPENROUTER_API_KEY=your_actual_openrouter_api_key_here
AI_REVIEWER_ENABLED=true
AI_REVIEWER_ENDPOINT=https://openrouter.ai/api/v1
AI_REVIEWER_MODEL=openrouter/anthropic/claude-3.5-sonnet
AI_REVIEWER_MAX_SEVERITY=medium

# Alternative: For OpenAI Direct
# OPENAI_API_KEY=your_actual_openai_api_key_here
# AI_REVIEWER_ENDPOINT=https://api.openai.com/v1
# AI_REVIEWER_MODEL=gpt-4
```

### 3. Test the Setup

```bash
# Test with actual API key
npx ts-node src/tools/ai-code-reviewer.ts

# Should show:
# - "🤖 Running AI code review..."
# - Actual code analysis results (if valid key)
# - OR informative warnings (if no key)
```

## Configuration Options

### Severity Levels

Control when the AI reviewer blocks commits:

```bash
AI_REVIEWER_MAX_SEVERITY=critical  # Only critical issues block
AI_REVIEWER_MAX_SEVERITY=high      # High+ issues block  
AI_REVIEWER_MAX_SEVERITY=medium    # Medium+ issues block (default)
AI_REVIEWER_MAX_SEVERITY=low       # Low+ issues block
AI_REVIEWER_MAX_SEVERITY=info      # All issues block
```

### Models Available

**OpenRouter:**
- `openrouter/anthropic/claude-3.5-sonnet` (recommended)
- `openrouter/openai/gpt-4`
- `openrouter/google/gemini-pro`

**OpenAI Direct:**
- `gpt-4`
- `gpt-3.5-turbo`

## Validation Pipeline Integration

The AI reviewer is integrated into the validation pipeline as stage 12:

```json
{
  "id": "ai-code-review",
  "name": "AI Code Review", 
  "command": "npx ts-node src/tools/ai-code-reviewer.ts",
  "timeout": 60000,
  "enabled": true,
  "continueOnFailure": true,
  "order": 12
}
```

## Troubleshooting

### Common Issues

**Issue**: "No valid API key configured"
**Solution**: Set `OPENROUTER_API_KEY` or `OPENAI_API_KEY` in your `.env` file

**Issue**: "401 Unauthorized" 
**Solution**: Your API key is invalid. Generate a new one or check for typos

**Issue**: "API request failed: 429 Too Many Requests"
**Solution**: You've hit rate limits. Wait a few minutes or upgrade your plan

**Issue**: "Timeout after 60 seconds"
**Solution**: Network issues or API overload. The system will continue anyway

### Debug Mode

Enable verbose logging:

```bash
LOG_LEVEL=debug npx ts-node src/tools/ai-code-reviewer.ts
```

### Cost Management

Typical costs:
- Small commits (1-5 files): $0.01 - $0.05
- Medium commits (5-15 files): $0.05 - $0.20  
- Large commits (15+ files): $0.20 - $1.00

To minimize costs:
- Set `AI_REVIEWER_ENABLED=false` when not needed
- Use `AI_REVIEWER_MAX_SEVERITY=high` to reduce output
- Commit smaller, focused changes

## Benefits

When properly configured, the AI reviewer provides:

1. **Security Analysis**: Identifies potential vulnerabilities
2. **Performance Insights**: Suggests optimizations
3. **Code Quality**: Enforces best practices
4. **Learning Tool**: Educational feedback on your code
5. **Consistency**: Standardized review criteria

## Example Output

```
🤖 AI Code Review Results
========================================
Files reviewed: 3
Total issues: 2

Issues by severity:
  🟡 medium: 1
  🔵 low: 1

📋 Notable Issues:

  src/api/users.ts:42
  MEDIUM: Potential SQL injection vulnerability in user query
  💡 Use parameterized queries or an ORM to prevent SQL injection

✅ No blocking issues found. Commit can proceed.
   Current blocking threshold: medium
```

## Integration with IDEs

The AI reviewer works automatically during git commits, but you can also:

1. **VS Code**: Run as a task
2. **CLI**: Execute manually on specific files
3. **CI/CD**: Integrate into your pipeline

This tool helps maintain code quality and catches issues early in the development process.