# Visual Regression Testing

This project uses Playwright's built-in visual regression testing to detect unexpected UI changes.

## How it Works

Instead of generating debug screenshots every test run, we now use Playwright's `toHaveScreenshot()` matcher which:

1. **First Run**: Creates baseline screenshots stored in `e2e/dashboard-navigation.spec.ts-snapshots/`
2. **Subsequent Runs**: Compares current screenshots against baselines
3. **Changes Detected**: Test fails if visual differences exceed the threshold (20%)
4. **Update Baselines**: Use `--update-snapshots` flag to accept new visual changes

## Configuration

Visual testing is configured in `playwright.config.ts`:

```typescript
expect: {
  toHaveScreenshot: {
    // 20% threshold for pixel differences
    threshold: 0.2,
    // Disable animations for consistent screenshots
    animations: 'disabled',
    // Consistent viewport clipping
    clip: { x: 0, y: 0, width: 1280, height: 720 },
  },
}
```

## Usage

### Running Tests
```bash
# Normal test run (compares against baselines)
npm run test:e2e

# First run or when you want to update baselines
npm run test:e2e -- --update-snapshots
```

### When Tests Fail
If visual regression tests fail, you have two options:

1. **Bug Found**: Fix the unexpected visual change
2. **Intentional Change**: Update baselines with `--update-snapshots`

### Best Practices

1. **Consistent Environment**: Tests use fixed 1280x720 viewport
2. **Stable Content**: Wait for loading states and animations to complete
3. **Selective Screenshots**: Only test key UI states, not every interaction
4. **Threshold Tuning**: 20% threshold allows for minor rendering differences

## Benefits

- **Automatic Detection**: Catches unintended visual regressions
- **Reduced File Size**: No debug screenshots generated every run
- **CI/CD Integration**: Baselines stored in Git, failures prevent deployment
- **Cross-Platform**: Consistent across different development environments

## Baseline Management

Baseline screenshots are stored in:
```
ui/e2e/dashboard-navigation.spec.ts-snapshots/
├── dashboard-initial-chromium-darwin.png
└── dashboard-request-logs-chromium-darwin.png
```

These files should be committed to Git to ensure consistent baselines across team members and CI/CD environments.