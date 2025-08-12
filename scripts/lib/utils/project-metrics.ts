/**
 * Project analysis and metrics collection
 */

import { execCommand } from "./review-utils";

export function getProjectMetrics(projectRoot: string): string {
  try {
    const linesOfCode =
      execCommand(
        'find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.rs" | xargs wc -l | tail -1 | awk \'{print $1}\'',
        projectRoot,
      ).trim() || "0";

    const testFiles =
      execCommand(
        'find . -name "*.test.*" -o -name "*.spec.*" | wc -l',
        projectRoot,
      ).trim() || "0";

    const totalFiles =
      execCommand(
        'find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.rs" | wc -l',
        projectRoot,
      ).trim() || "0";

    return `Lines of Code: ${linesOfCode}\nTest Files: ${testFiles}\nTotal Files: ${totalFiles}`;
  } catch (error) {
    return "Lines of Code: 0\nTest Files: 0\nTotal Files: 0";
  }
}
