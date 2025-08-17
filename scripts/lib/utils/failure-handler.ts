/**
 * Structured failure handling for precommit checks
 */

import { PrecommitResult } from "./utils";
import { REVIEW_FILE_NAME } from "./constants";

export interface CheckFailure {
  category: "test" | "lint" | "api-e2e" | "playwright" | "security" | "other";
  message: string;
  critical?: boolean;
}

export interface FailureReport {
  failures: CheckFailure[];
  fullOutput?: string;
}

/**
 * Create a structured failure handler
 */
export function createFailureHandler(): {
   
  addFailure: (failure: CheckFailure) => void;
  getReport: () => FailureReport;
  hasFailures: () => boolean;
  hasCriticalFailures: () => boolean;
} {
  const failures: CheckFailure[] = [];

  return {
    addFailure: (failure: CheckFailure) => {
      failures.push(failure);
    },
    getReport: () => ({ failures: [...failures] }),
    hasFailures: () => failures.length > 0,
    hasCriticalFailures: () => failures.some((f) => f.critical !== false),
  };
}

/**
 * Format failures for display
 */
function formatFailures(failures: CheckFailure[]): string {
  const sections = new Map<string, string[]>();

  // Group failures by category
  for (const failure of failures) {
    const category = failure.category;
    if (!sections.has(category)) {
      sections.set(category, []);
    }
    sections.get(category)!.push(failure.message);
  }

  // Format each section
  const formattedSections: string[] = [];

  if (sections.has("test")) {
    formattedSections.push(
      `FAILING TESTS:\n${sections.get("test")!.join("\n")}`,
    );
  }

  if (sections.has("lint")) {
    formattedSections.push(`LINT ISSUES:\n${sections.get("lint")!.join("\n")}`);
  }

  if (sections.has("api-e2e")) {
    formattedSections.push(
      `API E2E TEST FAILURES (CRITICAL):\n${sections.get("api-e2e")!.join("\n")}`,
    );
  }

  if (sections.has("playwright")) {
    formattedSections.push(
      `PLAYWRIGHT E2E TEST FAILURES:\n${sections.get("playwright")!.join("\n")}`,
    );
  }

  if (sections.has("security")) {
    formattedSections.push(
      `SECURITY ISSUES:\n${sections.get("security")!.join("\n")}`,
    );
  }

  if (sections.has("other")) {
    formattedSections.push(
      `OTHER ISSUES:\n${sections.get("other")!.join("\n")}`,
    );
  }

  return formattedSections.join("\n\n");
}

/**
 * Handle precommit failure using structured failure report
 */
export function handleStructuredFailure(
  report: FailureReport,
): PrecommitResult {
  if (!report.failures || report.failures.length === 0) {
    return {
      decision: "approve",
      feedback: `All checks passed! Code review comments generated in ${REVIEW_FILE_NAME}`,
    };
  }

  const hasCriticalFailures = report.failures.some((f) => f.critical !== false);
  const formattedFailures = formatFailures(report.failures);

  const message = `Pre-commit checks completed with issues:

${formattedFailures}

CRITICAL: API E2E tests must pass before Claude can stop working.
Run './scripts/run-api-e2e-vitest.sh' from the project root to run API E2E tests.
Run 'npm run frontend:test' from the project root to see full test output.
Run 'npm run frontend:lint' from the project root to see all linting issues.
Run 'npm run test:playwright' from the project root to see Playwright test results.`;

  if (hasCriticalFailures) {
    return {
      decision: "block",
      reason: message,
    };
  }

  return {
    decision: "approve",
    feedback: message,
  };
}
