# Security Checks in Pre-commit Hooks

The pre-commit hooks now include comprehensive security checks to ensure code quality and security standards. These checks use existing project dependencies and are integrated into the standard pre-commit workflow.

## Security Checks Included

### 1. Duplicate Code Detection

- **Tool**: `jscpd` (JavaScript Copy/Paste Detector)
- **Purpose**: Identifies duplicate code blocks that could indicate maintenance issues
- **Configuration**:
  - Minimum 10 lines for detection
  - Minimum 50 tokens for detection
  - Threshold of 3 for similarity
- **Files Checked**: `*.ts`, `*.tsx`, `*.rs` files
- **Exclusions**: `node_modules`, `target`, test files

### 2. Dead Code Detection

- **Tool**: `ts-prune`
- **Purpose**: Finds unused exports in TypeScript files
- **Configuration**: Runs with `--error` flag to fail on unused exports
- **Benefits**: Reduces bundle size and improves maintainability

### 3. Dependency Vulnerability Checks

- **Tool**: `npm audit`
- **Purpose**: Scans for known security vulnerabilities in dependencies
- **Configuration**:
  - Audit level: moderate and above
  - Excludes dev dependencies
- **Action**: Fails build if vulnerabilities are found

### 4. Rust Security Audit

- **Tool**: `cargo audit`
- **Purpose**: Checks Rust dependencies for security advisories
- **Database**: Uses RustSec Advisory Database
- **Coverage**: All Rust crates in the dependency tree

## Environment Variables

### Skip All Security Checks

```bash
SKIP_SECURITY_CHECKS=true
```

Use this to temporarily disable all security checks during development.

### Tool Availability

The security checks use tools that are already included in the project dependencies:

- **jscpd**: Already included in `devDependencies`
- **ts-prune**: Already included in `devDependencies`
- **unimported**: Already included in `devDependencies`
- **npm audit**: Built into npm
- **cargo audit**: Optional, install with `cargo install cargo-audit`

No additional installation is required for most checks.

## Security Check Results

### Success Case

When all security checks pass:

```
🔒 Running security checks...
✅ Duplicate Code Detection passed
✅ Dead Code Detection passed
✅ Dependency Vulnerabilities passed
✅ Rust Security Audit passed
```

### Failure Cases

#### Duplicate Code Found

```
❌ Duplicate Code Detection failed
🔍 DUPLICATE CODE DETECTED:
Clone found between lines 15-25 in file1.ts and lines 30-40 in file2.ts
```

#### Dead Code Found

```
❌ Dead Code Detection failed
🗑️  DEAD CODE DETECTED:
/src/utils/unused-function.ts:10 - unusedFunction
/src/components/old-component.tsx:5 - OldComponent
```

#### Vulnerabilities Found

```
❌ Dependency Vulnerabilities failed
🚨 DEPENDENCY VULNERABILITIES FOUND:
lodash  >=4.0.0 <4.17.21  Severity: high
```

#### Rust Security Issues

```
❌ Rust Security Audit failed
🚨 RUST SECURITY VULNERABILITIES FOUND:
Vulnerable crate: time v0.1.40
Advisory: RUSTSEC-2020-0071
```

## Best Practices

### Duplicate Code

- Refactor common patterns into shared utilities
- Use TypeScript interfaces for common type definitions
- Consider design patterns like Strategy or Template Method

### Dead Code

- Regularly review and remove unused exports
- Use IDE features to identify unused code
- Consider feature flags for conditional code

### Dependencies

- Keep dependencies up to date
- Use `npm audit fix` to automatically fix vulnerabilities
- Consider using `npm audit --audit-level high` for stricter checks

### Rust Security

- Update Rust dependencies regularly with `cargo update`
- Use `cargo audit fix` where available
- Subscribe to RustSec advisory notifications

## Integration with CI/CD

The security checks are automatically run as part of the pre-commit hooks, but can also be run manually:

```bash
# Run all pre-commit checks including security
npm run precommit

# Run individual security checks (if implemented separately)
npx jscpd
npx ts-prune --error
npm audit --audit-level moderate
cargo audit
```

## Troubleshooting

### Tool Not Found

If a security tool is not installed, the check will be skipped with a warning:

```
⚠️  jscpd not available - skipping duplicate code detection
```

### False Positives

- Configure `.jscpdrc` for duplicate code detection exclusions
- Use `// ts-prune-ignore-next` comments for intentional exports
- Use `npm audit --audit-level high` for only high-severity vulnerabilities

### Performance Impact

Security checks add ~30-60 seconds to pre-commit time. Use `SKIP_SECURITY_CHECKS=true` during rapid development cycles, but ensure to run full checks before pushing to main branches.
